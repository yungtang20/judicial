import { describe, expect, it } from 'vitest';
import { canTransition, assertTransition, ALLOWED_STAGE_TRANSITIONS } from './stageTransitions';
import { AppError } from './errors';

describe('Deterministic State Machine & Stage Transitions', () => {
  it('allows strict sequential state progression (01_plan -> 02_design -> 03_build -> 04_test -> 05_deploy -> 06_maintain)', () => {
    expect(canTransition('01_plan', '02_design')).toBe(true);
    expect(canTransition('02_design', '03_build')).toBe(true);
    expect(canTransition('03_build', '04_test')).toBe(true);
    expect(canTransition('04_test', '05_deploy')).toBe(true);
    expect(canTransition('05_deploy', '06_maintain')).toBe(true);

    expect(() => assertTransition('01_plan', '02_design')).not.toThrow();
    expect(() => assertTransition('02_design', '03_build')).not.toThrow();
    expect(() => assertTransition('03_build', '04_test')).not.toThrow();
    expect(() => assertTransition('04_test', '05_deploy')).not.toThrow();
    expect(() => assertTransition('05_deploy', '06_maintain')).not.toThrow();
  });

  it('strictly rejects illegal stage jumps (e.g. PLAN -> BUILD, PLAN -> DEPLOY, BUILD -> DEPLOY)', () => {
    expect(canTransition('01_plan', '03_build')).toBe(false);
    expect(canTransition('01_plan', '05_deploy')).toBe(false);
    expect(canTransition('03_build', '05_deploy')).toBe(false);
    expect(canTransition('06_maintain', '05_deploy')).toBe(false);

    expect(() => assertTransition('01_plan', '03_build')).toThrow(AppError);
    expect(() => assertTransition('01_plan', '05_deploy')).toThrow(AppError);
    expect(() => assertTransition('03_build', '05_deploy')).toThrow(AppError);
  });

  it('throws AppError with code INVALID_STAGE_TRANSITION and status 409', () => {
    try {
      assertTransition('01_plan', '04_test');
      expect.fail('應拋出異常');
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe('INVALID_STAGE_TRANSITION');
      expect(err.status).toBe(409);
      expect(err.details.allowedTarget).toBe('02_design');
    }
  });
});
