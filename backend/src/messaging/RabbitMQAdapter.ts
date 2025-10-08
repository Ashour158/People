// =====================================================
// RabbitMQ Message Queue Adapter
// Implementation for RabbitMQ message broker
// =====================================================

import amqp, { Channel, Connection, ConsumeMessage } from 'amqplib';
import { MessageQueueAdapter, QueueOptions } from './MessageQueueAdapter';
import { DomainEvent } from '../events/events';

export class RabbitMQAdapter implements MessageQueueAdapter {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly url: string;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 5000; // 5 seconds

  constructor(url: string = process.env.RABBITMQ_URL || 'amqp://localhost:5672') {
    this.url = url;
  }

  async connect(): Promise<void> {
    try {
      console.log('[RabbitMQ] Connecting to', this.url);
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      
      // Handle connection errors
      this.connection.on('error', (err) => {
        console.error('[RabbitMQ] Connection error:', err);
        this.handleConnectionError();
      });

      this.connection.on('close', () => {
        console.warn('[RabbitMQ] Connection closed');
        this.handleConnectionError();
      });

      // Set prefetch to prevent overwhelming consumers
      await this.channel.prefetch(10);

      console.log('[RabbitMQ] Connected successfully');
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('[RabbitMQ] Connection failed:', error);
      await this.handleConnectionError();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      console.log('[RabbitMQ] Disconnected');
    } catch (error) {
      console.error('[RabbitMQ] Disconnect error:', error);
    }
  }

  async assertExchange(exchange: string, type: string = 'topic'): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized. Call connect() first.');
    }
    await this.channel.assertExchange(exchange, type, { durable: true });
    console.log(`[RabbitMQ] Exchange "${exchange}" asserted (${type})`);
  }

  async assertQueue(queue: string, options: QueueOptions = {}): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized. Call connect() first.');
    }
    const queueOptions = {
      durable: options.durable !== false, // Default to true
      exclusive: options.exclusive || false,
      autoDelete: options.autoDelete || false,
      arguments: options.arguments || {},
    };
    await this.channel.assertQueue(queue, queueOptions);
    console.log(`[RabbitMQ] Queue "${queue}" asserted`);
  }

  async bindQueue(queue: string, exchange: string, routingKey: string): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized. Call connect() first.');
    }
    await this.channel.bindQueue(queue, exchange, routingKey);
    console.log(`[RabbitMQ] Queue "${queue}" bound to exchange "${exchange}" with routing key "${routingKey}"`);
  }

  async publish(exchange: string, routingKey: string, event: DomainEvent): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized. Call connect() first.');
    }

    const message = JSON.stringify(event);
    const published = this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(message),
      {
        persistent: true, // Survive broker restart
        contentType: 'application/json',
        timestamp: Date.now(),
        messageId: event.eventId,
        headers: {
          organizationId: event.organizationId,
          eventType: event.eventType,
          eventName: event.eventName,
        },
      }
    );

    if (!published) {
      console.warn(`[RabbitMQ] Message not published (buffer full): ${routingKey}`);
      // Wait for drain event
      await new Promise<void>((resolve) => {
        this.channel!.once('drain', () => resolve());
      });
    }

    console.log(`[RabbitMQ] Published event: ${event.eventName} (${event.eventId})`);
  }

  async subscribe(
    queue: string,
    routingKey: string,
    handler: (event: DomainEvent) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized. Call connect() first.');
    }

    await this.channel.consume(
      queue,
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        try {
          const event: DomainEvent = JSON.parse(msg.content.toString());
          console.log(`[RabbitMQ] Received event: ${event.eventName} (${event.eventId})`);

          await handler(event);

          // Acknowledge message after successful processing
          this.channel!.ack(msg);
          console.log(`[RabbitMQ] Acknowledged event: ${event.eventId}`);
        } catch (error) {
          console.error('[RabbitMQ] Error processing message:', error);
          
          // Check if message has been redelivered
          if (msg.fields.redelivered) {
            // Message failed again, send to dead letter queue
            console.error(`[RabbitMQ] Message ${msg.properties.messageId} failed after retry, rejecting`);
            this.channel!.nack(msg, false, false); // Don't requeue
          } else {
            // First failure, requeue for retry
            console.warn(`[RabbitMQ] Requeueing message ${msg.properties.messageId} for retry`);
            this.channel!.nack(msg, false, true); // Requeue
          }
        }
      },
      { noAck: false } // Manual acknowledgment
    );

    console.log(`[RabbitMQ] Subscribed to queue: ${queue}`);
  }

  private async handleConnectionError(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RabbitMQ] Max reconnect attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[RabbitMQ] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('[RabbitMQ] Reconnect failed:', error);
      }
    }, this.reconnectDelay * this.reconnectAttempts); // Exponential backoff
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    return this.connection !== null && this.channel !== null;
  }
}

// =====================================================
// Exchange and Queue Names Constants
// =====================================================

export const EXCHANGES = {
  HR_EVENTS: 'hr.events',
  HR_COMMANDS: 'hr.commands',
  HR_DLX: 'hr.dlx', // Dead Letter Exchange
};

export const QUEUES = {
  // Employee Events
  EMPLOYEE_CREATED: 'employee.created',
  EMPLOYEE_UPDATED: 'employee.updated',
  EMPLOYEE_TERMINATED: 'employee.terminated',

  // Leave Events
  LEAVE_REQUESTED: 'leave.requested',
  LEAVE_APPROVED: 'leave.approved',
  LEAVE_REJECTED: 'leave.rejected',

  // Attendance Events
  ATTENDANCE_CHECKED_IN: 'attendance.checked_in',
  ATTENDANCE_CHECKED_OUT: 'attendance.checked_out',

  // Payroll Events
  PAYROLL_RUN_CREATED: 'payroll.run_created',
  PAYROLL_RUN_PROCESSED: 'payroll.run_processed',
  PAYROLL_RUN_APPROVED: 'payroll.run_approved',

  // Notification Queues (consume multiple events)
  NOTIFICATION_ALL: 'notification.all',
  
  // Dead Letter Queue
  DLQ: 'dlq.all',
};

export const ROUTING_KEYS = {
  // Employee
  EMPLOYEE_CREATED: 'employee.created',
  EMPLOYEE_UPDATED: 'employee.updated',
  EMPLOYEE_TERMINATED: 'employee.terminated',

  // Leave
  LEAVE_REQUESTED: 'leave.requested',
  LEAVE_APPROVED: 'leave.approved',
  LEAVE_REJECTED: 'leave.rejected',

  // Attendance
  ATTENDANCE_CHECKED_IN: 'attendance.checked_in',
  ATTENDANCE_CHECKED_OUT: 'attendance.checked_out',

  // Payroll
  PAYROLL_RUN_CREATED: 'payroll.run_created',
  PAYROLL_RUN_PROCESSED: 'payroll.run_processed',
  PAYROLL_RUN_APPROVED: 'payroll.run_approved',

  // Wildcard patterns
  ALL_EMPLOYEE_EVENTS: 'employee.*',
  ALL_LEAVE_EVENTS: 'leave.*',
  ALL_ATTENDANCE_EVENTS: 'attendance.*',
  ALL_PAYROLL_EVENTS: 'payroll.*',
  ALL_EVENTS: '#',
};
