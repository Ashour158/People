// =====================================================
// Audit Service
// Business logic for audit logging
// =====================================================

import { IAuditLogRepository } from '../repositories/interfaces';
import { AuditAction } from '../domain/enums';

export class AuditService {
  constructor(private auditLogRepository: IAuditLogRepository) {}

  async auditChange(
    actorUserId: string,
    entityType: string,
    entityId: string,
    action: AuditAction | string,
    oldValue?: Record<string, any>,
    newValue?: Record<string, any>
  ): Promise<void> {
    // Calculate changes (simplified diff)
    const changes = this.calculateChanges(oldValue, newValue);
    
    // Extract user info from context (simplified)
    const username = actorUserId; // Would lookup actual username
    
    await this.auditLogRepository.create({
      organization_id: 'default', // Would get from context
      user_id: actorUserId,
      username,
      entity_type: entityType,
      entity_id: entityId,
      action,
      old_values: oldValue,
      new_values: newValue,
      changes,
    });
  }

  private calculateChanges(
    oldValue?: Record<string, any>,
    newValue?: Record<string, any>
  ): Record<string, any> | undefined {
    if (!oldValue && !newValue) {
      return undefined;
    }

    if (!oldValue) {
      return { ...newValue };
    }

    if (!newValue) {
      return undefined;
    }

    const changes: Record<string, any> = {};
    const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);

    for (const key of allKeys) {
      if (oldValue[key] !== newValue[key]) {
        changes[key] = {
          from: oldValue[key],
          to: newValue[key],
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : undefined;
  }
}
