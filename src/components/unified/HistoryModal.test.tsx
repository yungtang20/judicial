import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HistoryModal } from './HistoryModal';
import { GlobalUIProvider } from '../../contexts/GlobalUIContext';
import type { AnalysisRecord } from '../../lib/analysisHistory';

/**
 * 歷史記錄的每一筆必須可分辨。
 *
 * 實測：連續分析 6 次後，6 筆記錄的標題全部是
 * 「租賃契約修繕爭議 / 房屋漏水侵權損害賠償」——標題取自案件類型分類，
 * 同一類型的多筆記錄標題完全相同，使用者無從分辨哪一筆是哪個案子。
 */
const makeRecord = (id: string, inputText: string): AnalysisRecord => ({
  id,
  inputText,
  title: '租賃契約修繕爭議 / 房屋漏水侵權損害賠償',
  timestamp: Date.parse('2026-09-27T10:00:00Z'),
  workflowState: { router: { domain: '民事' } }
});

const noop = () => {};

const renderModal = (historyList: AnalysisRecord[]) =>
  render(
    <GlobalUIProvider>
      <HistoryModal
        showHistory
        setShowHistory={noop}
        historyList={historyList}
        setHistoryList={noop}
        loadFromHistory={noop}
        deleteFromHistory={noop}
        clearHistory={noop}
        inputNarrative=""
        setInputNarrative={noop}
        isSubmitting={false}
        setIsSubmitting={noop}
        workflowState={null}
        setWorkflowState={noop}
        supplementInput=""
        setSupplementInput={noop}
        isCopied={false}
        setIsCopied={noop}
        acknowledgeSafetyInSession={noop}
        isNode2Open={false}
        setIsNode2Open={noop}
        isNode4Open={false}
        setIsNode4Open={noop}
        isNode5Open={false}
        setIsNode5Open={noop}
        isNode6Open={false}
        setIsNode6Open={noop}
        customPreset={null}
        setCustomPreset={noop}
        showCustomPresetModal={false}
        setShowCustomPresetModal={noop}
        editPresetTitle=""
        setEditPresetTitle={noop}
        editPresetNarrative=""
        setEditPresetNarrative={noop}
        fileInputRef={{ current: null }}
        isDragOver={false}
        setIsDragOver={noop}
        isParsingFiles={false}
        setIsParsingFiles={noop}
        parsingStatus=""
        setParsingStatus={noop}
        batchQueue={[]}
        setBatchQueue={noop}
        batchIndex={0}
        isBatchRunning={false}
        handleExecuteWorkflow={vi.fn()}
        handleSupplementFact={vi.fn()}
        handleProceedFromSafety={noop}
        handleResetWorkflow={noop}
        handleCopyAnalysis={noop}
        handleSaveCurrentAsCustomPreset={noop}
        aiConfig={{}}
        setAiConfig={noop}
      />
    </GlobalUIProvider>
  );

describe('歷史記錄可分辨性', () => {
  it('多筆記錄必須顯示各自的案件事實摘要', () => {
    renderModal([
      makeRecord('a', '房東於退租時扣留押金五萬元，屢催不還。'),
      makeRecord('b', '房間天花板漏水，要求修繕並賠償裝修損失。'),
      makeRecord('c', '房東未依契約返還押金，已寄發存證信函催告。')
    ]);
    expect(screen.getByText(/扣留押金五萬元/)).toBeTruthy();
    expect(screen.getByText(/天花板漏水/)).toBeTruthy();
    expect(screen.getByText(/存證信函催告/)).toBeTruthy();
  });

  it('無案件事實紀錄時必須明說，不得留白', () => {
    renderModal([makeRecord('a', '')]);
    expect(screen.getByText(/無案件事實紀錄/)).toBeTruthy();
  });

  it('每一筆都必須可用鍵盤還原', () => {
    renderModal([makeRecord('a', '房東押金爭議'), makeRecord('b', '房間漏水爭議')]);
    const items = screen.getAllByRole('button', { name: /還原分析記錄/ });
    expect(items.length).toBe(2);
    for (const el of items) expect((el as HTMLElement).tabIndex).toBe(0);
  });
});
