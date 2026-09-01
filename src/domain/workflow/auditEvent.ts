/**
 * Immutable Audit Event Log System
 * 記錄所有關鍵工作流、審批、驗證與狀態轉移操作
 */

import { SdlcStageId } from '../sdlc/types';
import { ActorType } from './authorization';

export type AuditEventType =
  | 'STAGE_STARTED'
  | 'ARTIFACT_CREATED'
  | 'VALIDATION_PASSED'
  | 'VALIDATION_FAILED'
  | 'GATE_REQUESTED'
  | 'GATE_APPROVED'
  | 'GATE_REJECTED'
  | 'FEEDBACK_CREATED'
  | 'TRANSITION_COMPLETED'
  | 'TRANSITION_REJECTED'
  | 'AI_GENERATION_STARTED'
  | 'AI_GENERATION_COMPLETED';

export interface AuditEvent {
  eventId: string;
  workflowId: string;
  stageId: SdlcStageId;
  actorType: ActorType;
  actorId: string;
  eventType: AuditEventType;
  timestamp: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  metadata?: Record<string, any>;
}

export class AuditLogRepository {
  private events: AuditEvent[] = [];

  public log(event: Omit<AuditEvent, 'eventId' | 'timestamp'>): AuditEvent {
    const fullEvent: AuditEvent = {
      ...event,
      eventId: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    this.events.push(fullEvent);
    return fullEvent;
  }

  public getByWorkflow(workflowId: string): AuditEvent[] {
    return this.events.filter(e => e.workflowId === workflowId);
  }

  public getAll(): AuditEvent[] {
    return [...this.events];
  }

  public clear(): void {
    this.events = [];
  }
}

export const defaultAuditLogger = new AuditLogRepository();
