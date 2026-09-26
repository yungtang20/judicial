import { describe, expect, it } from 'vitest';
import { buildEvidenceTableMarkdown, evidenceRowsFromCase, evidenceRowsToCase, evidenceTableCells, issueRowsFromCase, issueRowsToCase, normalizeEvidenceRow } from './caseRowAdapters';

describe('case row adapters', () => {
  it('round-trips issue editor aliases through canonical CaseContext rows', () => {
    const rows = issueRowsFromCase([{ id: '1', title: '爭點', originalHolding: '原審', appealArgument: '上訴理由', relatedEvidenceCodes: '甲證一' }]);
    expect(rows[0].relatedEvidences).toBe('甲證一');
    expect(issueRowsToCase(rows)[0].relatedEvidenceCodes).toBe('甲證一');
  });

  it('keeps evidence editor fields aligned with the canonical evidence row', () => {
    const rows = evidenceRowsFromCase([{ id: '1', code: '1', relatedIssue: '爭點', investigationItem: '函調', investigationTarget: '銀行', targetAddress: '地址', provenFact: '待證事實', type: '書證' }]);
    expect(evidenceRowsToCase(rows)[0]).toMatchObject({ investigationItem: '函調', investigationTarget: '銀行', provenFact: '待證事實' });
  });

  it('lets canonical evidence fields win over stale legacy aliases', () => {
    const rows = evidenceRowsFromCase([{ id: '1', code: '1', relatedIssue: '新爭點', investigationItem: '函調銀行', investigationTarget: '合作金庫', targetAddress: '新地址', provenFact: '待證事實', target: '舊別名標的', method: '舊別名方法', holder: '舊別名保管機關', relatedIssueTitle: '舊別名爭點' }]);
    expect(rows[0]).toMatchObject({
      investigationTarget: '合作金庫',
      investigationItem: '函調銀行',
      targetAddress: '新地址',
      relatedIssue: '新爭點'
    });
  });

  it('re-derives legacy aliases from the canonical fields on every round-trip instead of freezing the seed snapshot', () => {
    const seeded = [{ id: '1', code: '1', relatedIssue: '爭點一', investigationItem: '訊問證人', investigationTarget: '證人甲', targetAddress: '舊地址', provenFact: '待證', target: '種子標的', method: '種子方法', holder: '種子保管機關' }];
    const editorRows = evidenceRowsFromCase(seeded);
    const edited = editorRows.map(row => ({ ...row, investigationTarget: '證人乙', investigationItem: '函調機關', targetAddress: '新地址', relatedIssue: '爭點二' }));
    const saved = evidenceRowsToCase(edited);
    expect(saved[0]).toMatchObject({
      investigationTarget: '證人乙',
      target: '證人乙',
      investigationItem: '函調機關',
      method: '函調機關',
      targetAddress: '新地址',
      holder: '新地址',
      relatedIssue: '爭點二',
      relatedIssueTitle: '爭點二'
    });
  });

  it('keeps legacy alias data readable when the canonical field is blank', () => {
    const row = normalizeEvidenceRow({ id: '1', code: '1', investigationTarget: '', target: '舊別名標的', holder: '舊別名保管機關', relatedIssueTitle: '舊別名爭點' });
    expect(row).toMatchObject({ investigationTarget: '舊別名標的', target: '舊別名標的', targetAddress: '舊別名保管機關', holder: '舊別名保管機關', relatedIssue: '舊別名爭點' });
  });

  it('produces identical field values for the clipboard export and the printed table', () => {
    const evidences = evidenceRowsToCase(evidenceRowsFromCase([
      { id: '1', code: '甲', relatedIssue: '爭點一', investigationItem: '函調銀行', investigationTarget: '合作金庫', targetAddress: '台北市', provenFact: '資金流向', type: '書證', necessity: '對方否認', note: '甲說', target: '種子標的' },
      { id: '2', code: '乙', relatedIssue: '爭點二', investigationItem: '', investigationTarget: '', targetAddress: '', provenFact: '' }
    ]));
    const bodyLines = buildEvidenceTableMarkdown(evidences).split('\n').slice(2);
    const exported = bodyLines.map(line => line.slice(1, -1).split('|').map(value => value.trim()));
    exported.forEach((columns, index) => {
      const cells = evidenceTableCells(evidences[index], index);
      expect(columns).toEqual([
        cells.code,
        cells.investigationTarget,
        cells.type,
        cells.provenFact,
        cells.relatedIssue,
        cells.targetAddress,
        cells.investigationItem,
        cells.necessity,
        cells.note
      ]);
    });
  });

  it('renders a placeholder instead of undefined for a freshly added evidence row', () => {
    const added = { id: '3', code: '3', relatedIssue: '爭點3：', investigationItem: '訊問證人', investigationTarget: '', targetAddress: '', provenFact: '' };
    const [saved] = evidenceRowsToCase([added]);
    const markdown = buildEvidenceTableMarkdown([saved]);
    expect(markdown).not.toContain('undefined');
    expect(markdown.split('\n')[2]).toBe('| 3 | - | 書證 | - | 爭點3： | - | 訊問證人 | - | - |');
  });
});
