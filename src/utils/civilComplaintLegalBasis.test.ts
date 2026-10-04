import { describe, expect, it } from 'vitest';
import { buildFallbackToolboxResult } from './toolboxFallbacks';

/**
 * 起訴狀不得主張使用者未陳述的案件事實。
 *
 * 實測發現：民事起訴狀模板先前把事實與法律依據寫死為借貸糾紛
 * （「緣被告於民國前向原告借得款項」、「原證一：借據影本」）。
 * 使用者填的是租屋押金糾紛時，產出的書狀仍主張借貸關係並要求提出借據——
 * 那是使用者從未陳述、也未必存在的事實。
 *
 * 律師據此遞狀，等於以捏造之事實陳述作為書證。
 */
const 產製 = (事實描述: string): string =>
  (buildFallbackToolboxResult(
    'CIVIL_COMPLAINT_GENERAL',
    { incidentDetails: 事實描述, searchQuery: 事實描述 } as never
  ) as never as { documentText: string }).documentText;

describe('民事起訴狀的法律依據須與實際爭點相符', () => {
  it('押金糾紛不得主張借貸關係或要求提出借據', () => {
    const doc = 產製('房東扣住五萬元押金不還，說要收清潔費但沒收據。');
    expect(doc).not.toContain('向原告借得款項');
    expect(doc).not.toContain('借據');
    // 民法第475條已刪除（官方現行法規回傳「（刪除）」，實測 2026-10-01）。
    // 押金返還錨定第259條第2款（受領金錢附加利息償還）；引用已刪除條文等同引用不存在的規定。
    expect(doc).not.toContain('民法第475條');
    expect(doc).toContain('民法第259條');
    expect(doc).toContain('租賃契約');
  });

  it('借貸糾紛才引用借貸相關法條', () => {
    const doc = 產製('朋友借我十萬元一直不還。');
    expect(doc).toContain('第478條');
    expect(doc).toContain('借據');
  });

  it('損害賠償糾紛引用民法第184條且不主張借貸', () => {
    const doc = 產製('我騎車被對方撞傷，住院治療。');
    expect(doc).toContain('民法第184條');
    expect(doc).not.toContain('向原告借得款項');
  });

  it('未提供事實描述時不得臆測爭點', () => {
    const doc = 產製('');
    expect(doc).not.toContain('向原告借得款項');
    expect(doc).not.toContain('借據');
  });

  it('每種爭點都必須載明法律依據，不得產生零引用的書狀', () => {
    for (const 事實 of [
      '房東扣住五萬元押金不還，說要收清潔費但沒收據。',
      '朋友借我十萬元一直不還。',
      '我騎車被對方撞傷，住院治療。',
      ''
    ]) {
      expect(產製(事實), `事實：${事實}`).toMatch(/民法第\d+條/);
    }
  });
});
