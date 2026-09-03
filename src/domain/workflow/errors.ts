/**
 * 統一應用錯誤模型 (AppError & Error Codes)
 * 供 Workflow Engine、Validator 與 API 邊界一致使用，禁止前端依賴字串解析判斷錯誤
 */

export type AppErrorCode =
  | 'INVALID_STAGE_TRANSITION'
  | 'MISSING_ARTIFACT'
  | 'GATE_NOT_READY'
  | 'VERIFICATION_FAILED'
  | 'PERMISSION_DENIED'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'SECURITY_VALIDATION_FAILED'
  | 'NEEDS_HUMAN_REVIEW'
  | 'INVALID_FEEDBACK_TRANSITION'
  | 'UNAUTHORIZED_ACTOR'
  | 'AI_GATE_APPROVAL_FORBIDDEN'
  | 'PROJECT_NOT_FOUND'
  | 'EXECUTION_MODE_RESTRICTION'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, any>;
  public readonly retryable: boolean;

  constructor(
    code: AppErrorCode,
    message: string,
    status: number = 400,
    details?: Record<string, any>,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryable = retryable;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  public toJSON() {
    return {
      error: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
      retryable: this.retryable
    };
  }
}
