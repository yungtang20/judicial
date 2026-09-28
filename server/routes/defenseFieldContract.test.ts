import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 前端送出的欄位名必須與端點解構的名稱一致。
 *
 * 實測：apiClient.defenseScanMines 送 `caseBackground`，
 * 而 /api/defense/scan-mines 只讀 `opponentClaims`，
 * 導致對手陳述從未進入掃描邏輯。
 *
 * 而「自認地雷掃描」的核心正是比對當事人陳述與對手主張——
 * 少了對手陳述，這個功能等於在對空氣作業，
 * 使用者卻看到一份看起來完整的分析。
 *
 * 這類脫節不會拋錯，只會靜默少一項輸入，因此用契約測試鎖住。
 */
describe('防禦端點的欄位契約', () => {
  const 端點 = readFileSync(join(process.cwd(), 'server', 'routes', 'defense.ts'), 'utf8');
  const apiClient = readFileSync(join(process.cwd(), 'src', 'lib', 'apiClient.ts'), 'utf8');


  it('地雷掃描提示詞的參數順序正確', () => {
    // getMineScanPrompt(clientInput, caseType, caseBackground)
    // 先前誤傳成 (陳述, 對手陳述, 案件類型)，
    // 等於讓 AI 把對手主張當成案件類型、案件類型當成背景資料。
    const mineScan區段 = 端點.slice(端點.indexOf('/api/defense/scan-mines'));
    expect(mineScan區段).toContain(
      'getMineScanPrompt(clientInput || "", caseType || "civil", String(對手陳述 || ""))',
    );
  });

  it('前端必須把當事人角色送給兩個 AI 端點', () => {
    // 角色是 B點實益判定的基礎（「這個角色有沒有可主張的空間」）。
    // UI 有 clientRole 狀態（預設「被告」）並用於產製書狀，
    // 卻從未送到 triage 與 mine-scan，等於讓 AI 盲判。
    const workflow = readFileSync(join(process.cwd(), 'src', 'components', 'DefenseWorkflowTool.tsx'), 'utf8');
    const triage呼叫 = workflow.slice(workflow.indexOf('defenseTriage'));
    const scan呼叫 = workflow.slice(workflow.indexOf('defenseScanMines'), workflow.indexOf('defenseScanMines') + 300);

    expect(triage呼叫, 'defenseTriage 未送出角色').toContain('litigationRole: clientRole');
    expect(scan呼叫, 'defenseScanMines 未送出角色').toContain('litigationRole: clientRole');
  });

  it('兩個端點都解構 litigationRole', () => {
    const triage區段 = 端點.slice(端點.indexOf('/api/defense/triage'), 端點.indexOf('/api/defense/scan-mines'));
    const scan區段 = 端點.slice(端點.indexOf('/api/defense/scan-mines'));
    expect(triage區段).toMatch(/const \{[^}]*litigationRole[^}]*\} = req\.body/);
    expect(scan區段).toMatch(/const \{[^}]*litigationRole[^}]*\} = req\.body/);
  });
  it('scan-mines 接受前端實際使用的 caseBackground', () => {
    expect(apiClient, '前端使用 caseBackground').toContain('caseBackground');
    expect(端點, '端點必須解構 caseBackground').toMatch(/const \{[^}]*caseBackground[^}]*\} = req\.body/);
  });

  it('scan-mines 仍優先使用 opponentClaims', () => {
    // 兩個名稱並存時，語意較明確的 opponentClaims 優先。
    expect(端點).toContain('opponentClaims ?? caseBackground');
  });

  it('對手陳述確實被帶入提示詞與法源檢索', () => {
    const mineScan區段 = 端點.slice(端點.indexOf('/api/defense/scan-mines'));
    expect(mineScan區段).toContain('getMineScanPrompt(clientInput || "", caseType || "civil", String(對手陳述 || "")');
    expect(mineScan區段).toMatch(/ragQuery = `[^`]*\$\{對手陳述/);
  });

  it('triage 端點的欄位與前端一致', () => {
    const triage區段 = 端點.slice(端點.indexOf('/api/defense/triage'), 端點.indexOf('/api/defense/scan-mines'));
    // 前端送 clientInput / caseType / courtName / caseNo
    for (const 欄位 of ['clientInput', 'caseType', 'courtName', 'caseNo']) {
      expect(triage區段, `triage 端點未解構 ${欄位}`).toContain(欄位);
    }
  });
});
