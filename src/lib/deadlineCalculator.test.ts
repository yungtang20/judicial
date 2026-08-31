import { describe, it, expect } from 'vitest';
import { isWeekendOrHoliday, getNextWorkingDay, calculateDeadline } from './deadlineCalculator';

describe('deadlineCalculator', () => {
  it('should get next working day correctly', () => {
    // Friday
    const friday = new Date(2023, 0, 6);
    expect(getNextWorkingDay(friday).date.getTime()).toBe(friday.getTime());
    expect(getNextWorkingDay(friday).deferredDays).toBe(0);

    // Saturday -> Monday
    const saturday = new Date(2023, 0, 7);
    const expectedMonday = new Date(2023, 0, 9);
    expect(getNextWorkingDay(saturday).date.getTime()).toBe(expectedMonday.getTime());
    expect(getNextWorkingDay(saturday).deferredDays).toBe(2);
  });
});
  it('should calculate deadline correctly skipping holidays if deadline lands on one', () => {
    // Receive Date: 2024-03-22
    // Statutory days: 10
    // Travel days: 0
    // Initial deadline: 2024-04-01 (Monday), it's a working day
    const d1 = calculateDeadline(new Date(2024, 2, 22), 10, 0);
    expect(d1.date.getFullYear()).toBe(2024);
    expect(d1.date.getMonth()).toBe(3); // April
    expect(d1.date.getDate()).toBe(1);

    // Receive Date: 2024-03-25
    // Statutory days: 10
    // Travel days: 0
    // Initial deadline: 2024-04-04 (Thursday - Holiday) -> Next working day: 2024-04-08 (Monday)
    const d2 = calculateDeadline(new Date(2024, 2, 25), 10, 0);
    expect(d2.date.getFullYear()).toBe(2024);
    expect(d2.date.getMonth()).toBe(3); // April
    expect(d2.date.getDate()).toBe(8); // April 8th
  });
