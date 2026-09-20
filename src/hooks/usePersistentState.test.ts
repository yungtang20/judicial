import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistentState } from './usePersistentState';

describe('usePersistentState', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('should use initial value if localStorage is empty', () => {
    const { result } = renderHook(() => usePersistentState('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('should use value from localStorage if available', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'));
    const { result } = renderHook(() => usePersistentState('test-key', 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('should update state and save to localStorage after delay', () => {
    const { result } = renderHook(() => usePersistentState('test-key', 'default'));
    
    act(() => {
      result.current[1]('new value');
    });

    expect(result.current[0]).toBe('new value');
    expect(localStorage.getItem('test-key')).toBeNull(); // Not saved yet (delay)

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('new value'));
  });
});
