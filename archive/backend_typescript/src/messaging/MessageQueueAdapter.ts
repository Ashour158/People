// =====================================================
// Message Queue Adapter Interface
// Abstraction for message queue operations
// =====================================================

import { DomainEvent } from '../events/events';

export interface MessageQueueAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(exchange: string, routingKey: string, event: DomainEvent): Promise<void>;
  subscribe(queue: string, routingKey: string, handler: (event: DomainEvent) => Promise<void>): Promise<void>;
  assertExchange(exchange: string, type: string): Promise<void>;
  assertQueue(queue: string, options?: QueueOptions): Promise<void>;
  bindQueue(queue: string, exchange: string, routingKey: string): Promise<void>;
}

export interface QueueOptions {
  durable?: boolean;
  exclusive?: boolean;
  autoDelete?: boolean;
  arguments?: Record<string, any>;
}

export interface ConsumeOptions {
  noAck?: boolean;
  consumerTag?: string;
}
