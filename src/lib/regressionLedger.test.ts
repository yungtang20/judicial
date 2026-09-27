import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * 多輪修正的回歸保護。
 *
 * 連續修正同一批檔案時，後來的操作可能無意間推翻先前的修正。
 * 每一條修正都對應一個真實缺陷，這裡確保它們不會被靜默還原。
 *
 * 新增修正時，請一併在此登錄，並讓對應測試真正涵蓋該行為——
 * 測試全綠不能取代這項檢查。
 */

const SRC = path.resolve(__dirname, '..');

interface 修正 {
  項目: string;
  檔案: string;
  /** 必須在原始碼中出現的程式碼片段。 */
  片段: string;
  為何重要: string;
}

const 修正清單: 修正[] = [
  {
    項目: '押金糾紛不得被誤判為刑事竊盜',
    檔案: 'lib/universalTriage.ts',
    片段: 'isRentalDepositDispute',
    為何重要: '竊盜分支的「不還」關鍵字排在租屋押金分支之前，會把純民事的押金爭議歸為刑事並引用刑法第320條'
  },
  {
    項目: '起訴狀法律依據須依實際爭點決定',
    檔案: 'utils/toolboxFallbacks.ts',
    片段: '是租賃押金爭議',
    為何重要: '模板原硬寫「向原告借得款項」與「借據影本」，押金糾紛會被寫成借貸關係並要求提出不存在的借據'
  },
  {
    項目: '零引用時不得呈現為可直接遞狀',
    檔案: 'components/LegalToolbox.tsx',
    片段: 'totalCitationsChecked === 0',
    為何重要: '零引用的書狀曾與「100% 完成／隨時可匯出」並列顯示'
  },
  {
    項目: '零引用提示涵蓋爭點表',
    檔案: 'components/IssueTableGenerator.tsx',
    片段: 'totalCitationsChecked === 0',
    為何重要: '同一提示需出現在所有產出路徑'
  },
  {
    項目: '零引用提示涵蓋防禦流程',
    檔案: 'components/DefenseWorkflowTool.tsx',
    片段: 'totalCitationsChecked === 0',
    為何重要: '同上'
  },
  {
    項目: '零引用提示涵蓋上訴狀助理',
    檔案: 'hooks/useSmartAppealAssistant.ts',
    片段: 'totalCitationsChecked === 0',
    為何重要: '同上；此檔為 .ts，只掃 .tsx 的防護會漏掉它'
  },
  {
    項目: '例假日表以實際建檔截止日判斷',
    檔案: 'lib/deadlineCalculator.ts',
    片段: 'HOLIDAY_TABLE_LAST_COVERED_DATE',
    為何重要: '只看年份會高估涵蓋範圍，期限落在表外卻不警告，使用者可能喪失上訴權利'
  },
  {
    項目: 'AI 未設定金鑰不得回報為逾時',
    檔案: '../server/services/agentChat.ts',
    片段: 'isProviderConfigError',
    為何重要: '設定問題被說成逾時，使用者會一直重試而永遠不會成功'
  },
  {
    項目: '安全分流不得預設情境類別',
    檔案: 'components/LegalProcessGuide.tsx',
    片段: "useState<string>('')",
    為何重要: "原預設 'SEXUAL_HARM'，未選擇就把每個人當成性侵害案件處理"
  },
  {
    項目: '安全分流不得預設關係人',
    檔案: 'components/LegalProcessGuide.tsx',
    片段: "['relationship']>('')",
    為何重要: "原預設 'SPOUSE'，使 isFamilyRelation 對每個人為真，陌生人侵害也被導成家暴路徑"
  },
  {
    項目: '純函式與 hooks 使用模組層級提示',
    檔案: 'lib/userNotice.ts',
    片段: 'export function notify',
    為何重要: '這類模組拿不到 React context，先前只能靠原生 alert 凍結頁面'
  },
  {
    項目: '繁體中文防護須涵蓋元件',
    檔案: 'lib/aiOutputTraditionalGuard.test.ts',
    片段: 'tsx?$',
    為何重要: '原只收 .ts，跳過全部 77 個 .tsx，而使用者可見的中文幾乎都在元件裡'
  },
  {
    項目: '繁體中文防護須涵蓋 JSX 元素文字',
    檔案: 'lib/aiOutputTraditionalGuard.test.ts',
    片段: 'JSX 元素文字',
    為何重要: '只擷取字串常值，會漏掉 <div>不当得利</div> 這種寫法'
  },
  {
    項目: '扶養費須揭露法定金額基準年度',
    檔案: 'lib/calculatorEngines/childSupport.ts',
    片段: 'REGIONAL_LIVING_EXPENSES_BASIS_YEAR',
    為何重要: '113 年度資料未標年度，使用者會把兩年前的數字當現值'
  },
  {
    項目: '二審裁判費須依一審是否酌減分流',
    檔案: 'lib/calculatorEngines/courtFee.ts',
    片段: 'firstInstanceFeeReduced',
    為何重要: '§77-16 的加徵比例以一審是否依§77-9 酌減為前提，兩種情形相差三倍'
  },
  {
    項目: '底層費率函式接受酌減前提',
    檔案: 'lib/calculatorEngines/statutoryStandards.ts',
    片段: 'firstInstanceFeeReduced',
    為何重要: '同上；只改介面不改底層會讓其他呼叫端仍算錯'
  }
];

describe('多輪修正的回歸保護', () => {
  it.each(修正清單)('$項目', ({ 檔案, 片段 }) => {
    const 完整 = path.join(SRC, 檔案);
    const src = readFileSync(完整, 'utf8');
    expect(
      src.includes(片段),
      `${檔案} 缺少「${片段}」——此修正可能被後續修改推翻。原始碼中應保留：${片段}`
    ).toBe(true);
  });

  it('原生對話框不得在任何 .ts 檔重新出現', () => {
    // 與 noNativeDialogs 防護使用相同的剝除邏輯（先移除註解），
    // 否則註解中提到 alert() 的說明文字會被誤判。
    const 剝除註解 = (src: string): string =>
      src
        .replace(/\r\n/g, '\n')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .map(line => line.replace(/\/\/.*$/, ''))
        .join('\n');
    const 關鍵檔 = ['hooks/useSmartAppealAssistant.ts', 'hooks/appealDocumentActions.ts'];
    for (const 檔 of 關鍵檔) {
      const code = 剝除註解(readFileSync(path.join(SRC, 檔), 'utf8'));
      const 命中 = code.match(/(^|[^a-zA-Z.$])(alert|confirm|prompt)\s*\(/);
      expect(命中, `${檔} 出現原生對話框`).toBeNull();
    }
  });

  it('修正清單本身不得為空', () => {
    expect(修正清單.length, '修正清單為空，意味著回歸保護失效').toBeGreaterThan(10);
  });
});
