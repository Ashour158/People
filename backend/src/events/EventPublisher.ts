// =====================================================
// Event Publisher
// Publishes domain events to the outbox for eventual consistency
// =====================================================

import { IEventOutboxRepository } from '../repositories/interfaces';
import { DomainEvent } from './events';

export class EventPublisher {
  constructor(private eventOutboxRepository: IEventOutboxRepository) {}

  async publish(event: Omit<DomainEvent, 'eventId' | 'timestamp'>): Promise<void> {
    try {
      const eventId = await this.eventOutboxRepository.create({
        organization_id: event.organizationId,
        event_type: event.eventType,
        event_name: event.eventName,
        aggregate_type: event.aggregateType,
        aggregate_id: event.aggregateId,
        payload: event.payload as Record<string, any>,
        metadata: {
          ...event.metadata,
          publishedAt: new Date().toISOString(),
        },
      });

      console.log(`Event published: ${event.eventName} (ID: ${eventId})`);
    } catch (error) {
      console.error('Failed to publish event:', error);
      throw new Error(`Event publishing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async publishBatch(events: Array<Omit<DomainEvent, 'eventId' | 'timestamp'>>): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
