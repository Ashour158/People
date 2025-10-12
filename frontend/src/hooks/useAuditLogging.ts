import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';

interface AuditEvent {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  changes: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
  sessionId: string;
  metadata: Record<string, any>;
}

interface AuditConfig {
  enableRealTime: boolean;
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
}

class AuditLogger {
  private events: AuditEvent[] = [];
  private config: AuditConfig;
  private flushTimer: NodeJS.Timeout | null = null;
  private retryCount = 0;

  constructor(config: AuditConfig) {
    this.config = config;
    
    if (config.enableRealTime) {
      this.startFlushTimer();
    }
  }

  log(event: Omit<AuditEvent, 'id' | 'timestamp' | 'ipAddress' | 'userAgent' | 'sessionId'>) {
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId(),
    };

    this.events.push(auditEvent);

    if (this.config.enableRealTime) {
      this.flushEvents();
    } else if (this.events.length >= this.config.batchSize) {
      this.flushEvents();
    }
  }

  private async flushEvents() {
    if (this.events.length === 0) return;

    const eventsToFlush = [...this.events];
    this.events = [];

    try {
      await this.sendEvents(eventsToFlush);
      this.retryCount = 0;
    } catch (error) {
      console.error('Failed to send audit events:', error);
      this.retryCount++;
      
      if (this.retryCount < this.config.maxRetries) {
        // Re-add events to queue for retry
        this.events.unshift(...eventsToFlush);
        setTimeout(() => this.flushEvents(), 5000);
      }
    }
  }

  private async sendEvents(events: AuditEvent[]) {
    const response = await fetch('/api/v1/audit/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      throw new Error(`Audit logging failed: ${response.statusText}`);
    }
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.config.flushInterval);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIP(): string {
    // In a real implementation, this would be provided by the server
    return 'unknown';
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushEvents();
  }
}

// Global audit logger instance
const auditLogger = new AuditLogger({
  enableRealTime: true,
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  maxRetries: 3,
});

export const useAuditLogging = () => {
  const { user } = useAuthStore();
  const loggerRef = useRef(auditLogger);

  const logEvent = useCallback((
    action: string,
    resource: string,
    resourceId?: string,
    changes?: Record<string, any>,
    riskLevel: 'low' | 'medium' | 'high' = 'low',
    metadata?: Record<string, any>
  ) => {
    if (!user) return;

    loggerRef.current.log({
      userId: user.user_id,
      action,
      resource,
      resourceId,
      changes,
      riskLevel,
      metadata,
    });
  }, [user]);

  const logUserAction = useCallback((
    action: string,
    resource: string,
    resourceId?: string,
    changes?: Record<string, any>
  ) => {
    logEvent(action, resource, resourceId, changes, 'low');
  }, [logEvent]);

  const logSecurityEvent = useCallback((
    action: string,
    resource: string,
    resourceId?: string,
    changes?: Record<string, any>
  ) => {
    logEvent(action, resource, resourceId, changes, 'high', {
      securityEvent: true,
      timestamp: new Date().toISOString(),
    });
  }, [logEvent]);

  const logDataChange = useCallback((
    action: string,
    resource: string,
    resourceId: string,
    oldData: any,
    newData: any
  ) => {
    const changes = this.calculateChanges(oldData, newData);
    logEvent(action, resource, resourceId, changes, 'medium');
  }, [logEvent]);

  const logSystemEvent = useCallback((
    action: string,
    resource: string,
    metadata?: Record<string, any>
  ) => {
    logEvent(action, resource, undefined, undefined, 'low', {
      systemEvent: true,
      ...metadata,
    });
  }, [logEvent]);

  const calculateChanges = useCallback((oldData: any, newData: any) => {
    const changes: Record<string, any> = {};
    
    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          old: oldData[key],
          new: newData[key],
        };
      }
    }
    
    return changes;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      loggerRef.current.destroy();
    };
  }, []);

  return {
    logEvent,
    logUserAction,
    logSecurityEvent,
    logDataChange,
    logSystemEvent,
    calculateChanges,
  };
};
