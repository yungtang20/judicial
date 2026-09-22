export function isWeekendOrHoliday(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

export function getNextWorkingDay(date: Date): { date: Date; deferredDays: number } {
  let current = new Date(date.getTime());
  let deferredDays = 0;
  while (isWeekendOrHoliday(current)) {
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    deferredDays++;
  }
  return { date: current, deferredDays };
}

export function calculateDeadline(baseDate: Date, statutoryDays: number, travelDays: number = 0): {
  rawDate: Date;
  finalDate: Date;
  deferredDays: number;
} {
  const totalDays = statutoryDays + travelDays;
  const rawDate = new Date(baseDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
  const { date: finalDate, deferredDays } = getNextWorkingDay(rawDate);
  return { rawDate, finalDate, deferredDays };
}
