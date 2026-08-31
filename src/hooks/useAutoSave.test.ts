import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('should not save on first render', () => {
    renderHook(() => useAutoSave('test-key', { foo: 'bar' }, () => {}));
    vi.advanceTimersByTime(1500);
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('should save after value changes and delay passes', () => {
    const { rerender } = renderHook(({ val }) => useAutoSave('test-key', val, () => {}), {
      initialProps: { val: { foo: 'bar' } }
    });

    // Update value
    rerender({ val: { foo: 'baz' } });

    // Fast-forward time
    vi.advanceTimersByTime(1500);

    const saved = localStorage.getItem('test-key');
    expect(saved).toBe(JSON.stringify({ foo: 'baz' }));
  });
});
