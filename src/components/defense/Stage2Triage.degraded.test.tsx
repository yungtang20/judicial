import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stage2Triage } from './Stage2Triage';
import type { DefenseTriageResult } from '../../types';

/**
 * 辯護判定的降級必須揭露。
 *
 * 實測：defense-triage 的 p90 延遲為 30.5 秒，已貼近 30 秒的供應商逾時上限，
 * 也就是「AI 逾時後退回本機規則」不是假設情境，而是隨時會發生。
 *
 * API 一直都有回 isFallback，但這個畫面完全沒有使用它：
 * 使用者等了近 30 秒拿到規則產生的答案，
 * 外觀與真正 AI 分析完全相同，連「信心分數」都被當成 AI 的判斷依據呈現。
 *
 * 對法律工具而言，讓使用者分不清答案是 AI 評估還是規則輸出，
 * 等於讓他在不知情的狀況下依賴一個他不知道來源的結論。
 */

const 基本結果: DefenseTriageResult = {
  decision: 'TRACK_1_FACTS',
  confidenceScore: 82,
  decisionReason: '陳述中有具體客觀事實可供查證',
  concreteFacts: [
    {
      id: 'fact-1',
      category: 'LOCATION',
      factDescription: '案發時被告在後方整理貨架',
      involvedParties: '被告、指控之顧客',
      timeframe: '案發當時',
      location: '便利商店後方貨架區',
      evidenceClues: '店內監視器錄影',
      pendingProof: '請調閱店內監視器錄影',
      strategicValue: 'HIGH',
    },
  ],
  unfruitfulPoints: [],
  summaryOverview: '被告主張不在場，有監視器可證。',
};

const 容器 = (結果: DefenseTriageResult) =>
  render(
    <Stage2Triage
      triageResult={結果}
      setCurrentStage={() => {}}
      handleRunMineScan={() => {}}
    />,
  );

describe('辯護判定的降級揭露', () => {
  it('降級時必須明確標示非 AI 分析', () => {
    容器({ ...基本結果, isFallback: true });
    expect(screen.getByText(/本次為離線備援結果，非 AI 分析/)).toBeInTheDocument();
  });

  it('降級時不得把規則算出的信心分數呈現為 AI 判斷', () => {
    容器({ ...基本結果, isFallback: true });
    expect(screen.queryByText(/信心分數：82%/)).not.toBeInTheDocument();
  });

  it('降級時要說明請人工複核', () => {
    容器({ ...基本結果, isFallback: true });
    expect(screen.getByText(/人工複核/)).toBeInTheDocument();
  });

  it('非降級時呈現信心分數', () => {
    容器(基本結果);
    expect(screen.getByText(/信心分數：82%/)).toBeInTheDocument();
  });

  it('非降級時不得出現降級提示', () => {
    容器(基本結果);
    expect(screen.queryByText(/離線備援結果/)).not.toBeInTheDocument();
  });

  it('isFallback 未定義時視為非降級', () => {
    容器({ ...基本結果, isFallback: undefined });
    expect(screen.queryByText(/離線備援結果/)).not.toBeInTheDocument();
  });

  it('無結果時不渲染', () => {
    const { container } = render(
      <Stage2Triage triageResult={null} setCurrentStage={() => {}} handleRunMineScan={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
