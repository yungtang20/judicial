/**
 * Judicial Service Hours Utility
 *
 * The Judicial OpenData API (judgment.judicial.gov.tw) only supports
 * authentication and data fetching during service hours:
 *   Asia/Taipei timezone, 00:00–05:59 (hour >= 0 && hour < 6).
 *
 * Outside of service hours, requests are rejected without even
 * attempting authentication — fail-closed.
 */

const SERVICE_TIMEZONE = "Asia/Taipei";

export interface ServiceHoursCheck {
  withinHours: boolean;
  currentHour: number;
  reason: string;
}

/**
 * Check whether the current time in Asia/Taipei falls within
 * the Judicial OpenData service window (00:00–05:59).
 */
export function isWithinServiceHours(now?: Date): ServiceHoursCheck {
  const current = now ?? new Date();
  const taipeiHour = parseInt(
    current.toLocaleString("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: SERVICE_TIMEZONE,
    }),
    10
  );

  const withinHours = taipeiHour >= 0 && taipeiHour < 6;

  return {
    withinHours,
    currentHour: taipeiHour,
    reason: withinHours
      ? `目前台北時間 ${taipeiHour}:00，位於服務時段內（00:00–05:59）`
      : `目前台北時間 ${taipeiHour}:00，位於服務時段外（00:00–05:59），無法存取司法院法規資料檢索系統`,
  };
}
