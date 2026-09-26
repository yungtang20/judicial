import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ToolProvider, useToolContext } from './ToolContext';

function ContextProbe() {
  const { route, navigate } = useToolContext();
  return (
    <>
      <span data-testid="route-view">{route.view}</span>
      <button type="button" onClick={() => navigate({ view: 'litigation', section: 'toolbox' })}>前往工具箱</button>
      <button type="button" onClick={() => navigate({ view: 'analysis' })}>重新整理案件</button>
      <button type="button" onClick={() => navigate({ view: 'litigation', section: 'evidence' }, { facts: '新案件事實', sourceTool: 'unified' })}>帶資料前往工具箱</button>
    </>
  );
}

describe('ToolContext', () => {
  beforeEach(() => localStorage.clear());

  it('clears an unconsumed cross-feature context on ordinary cross-view navigation', () => {
    localStorage.setItem('cross_feature_context', JSON.stringify({
      facts: '舊案件事實',
      issuesSummary: '舊案件爭點',
      sourceTool: 'unified',
      timestamp: Date.now(),
    }));

    render(<ToolProvider><ContextProbe /></ToolProvider>);
    expect(screen.getByTestId('route-view')).toHaveTextContent('analysis');
    expect(localStorage.getItem('cross_feature_context')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '前往工具箱' }));

    expect(screen.getByTestId('route-view')).toHaveTextContent('litigation');
    expect(localStorage.getItem('cross_feature_context')).toBeNull();
  });

  it('clears unconsumed context on same-view navigation', () => {
    localStorage.setItem('cross_feature_context', JSON.stringify({
      facts: '舊案件事實',
      issuesSummary: '舊案件爭點',
      sourceTool: 'unified',
      timestamp: Date.now(),
    }));

    render(<ToolProvider><ContextProbe /></ToolProvider>);
    fireEvent.click(screen.getByRole('button', { name: '重新整理案件' }));

    expect(screen.getByTestId('route-view')).toHaveTextContent('analysis');
    expect(localStorage.getItem('cross_feature_context')).toBeNull();
  });

  it('preserves cross-feature context for an explicit typed handoff', () => {
    const context = {
      facts: '舊案件事實',
      issuesSummary: '舊案件爭點',
      sourceTool: 'unified',
      timestamp: Date.now(),
    };
    localStorage.setItem('cross_feature_context', JSON.stringify(context));

    render(<ToolProvider><ContextProbe /></ToolProvider>);
    fireEvent.click(screen.getByRole('button', { name: '帶資料前往工具箱' }));

    expect(screen.getByTestId('route-view')).toHaveTextContent('litigation');
    expect(JSON.parse(localStorage.getItem('cross_feature_context') || 'null')).toEqual(context);
  });
});
