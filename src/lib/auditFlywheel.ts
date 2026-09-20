/**
 * 稽核資料飛輪：把被擋下的生成與驗證失敗排出名次，每週只修第一名。
 *
 * 設計原則：
 * - 純函式，不碰資料庫、不打網路，輸入直接來自既有的稽核查詢結果。
 * - 只看 FAILURE 與 DENIED，SUCCESS 不進排名，避免平均數掩蓋尾部。
 * - 最小揭露：只彙整動作、資源、狀態碼與筆數，不碰任何個資欄位。
 */

export interface FlywheelLogInput {
  action: string;
  resource: string;
  status: 'SUCCESS' | 'FAILURE' | 'DENIED';
  statusCode: number;
}

export interface FailureGroup {
  action: string;
  resource: string;
  status: 'FAILURE' | 'DENIED';
  statusCode: number;
  count: number;
  share: number;
}

export interface FlywheelSummary {
  total: number;
  failureCount: number;
  failureRate: number;
  groups: FailureGroup[];
}

/** 將稽核紀錄依動作、資源、狀態彙整並由多到少排序。 */
export function summarizeAuditFailures(entries: FlywheelLogInput[]): FlywheelSummary {
  const total = entries.length;
  const failures = entries.filter((entry) => entry.status !== 'SUCCESS');
  const failureCount = failures.length;

  const counts = new Map<string, FailureGroup>();
  for (const entry of failures) {
    if (entry.status === 'SUCCESS') continue;
    const key = `${entry.action} ${entry.resource} ${entry.status} ${entry.statusCode}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        action: entry.action,
        resource: entry.resource,
        status: entry.status,
        statusCode: entry.statusCode,
        count: 1,
        share: 0
      });
    }
  }

  const groups = [...counts.values()]
    .map((group) => ({
      ...group,
      share: failureCount === 0 ? 0 : group.count / failureCount
    }))
    .sort((a, b) => b.count - a.count || a.action.localeCompare(b.action));

  return {
    total,
    failureCount,
    failureRate: total === 0 ? 0 : failureCount / total,
    groups
  };
}

/** 取出前 N 個失敗群組，預設 5 個，工作記憶體一次只看 5 項。 */
export function topFailureGroups(summary: FlywheelSummary, limit = 5): FailureGroup[] {
  return summary.groups.slice(0, Math.max(0, limit));
}

/** 產出可直接貼進週會紀錄的純文字報告。 */
export function formatFlywheelReport(summary: FlywheelSummary, limit = 5): string {
  const lines = [
    `稽核資料飛輪週報：共 ${summary.total} 筆，失敗 ${summary.failureCount} 筆（${(summary.failureRate * 100).toFixed(1)}%）`
  ];
  const top = topFailureGroups(summary, limit);
  if (top.length === 0) {
    lines.push('本週無失敗紀錄，飛輪無待修項目。');
    return lines.join('\n');
  }
  top.forEach((group, index) => {
    lines.push(
      `${index + 1}. ${group.action} ${group.resource}（${group.status}/${group.statusCode}）：${group.count} 筆，佔失敗 ${(group.share * 100).toFixed(1)}%`
    );
  });
  return lines.join('\n');
}
