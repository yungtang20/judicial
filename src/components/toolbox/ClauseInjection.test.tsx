import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InteractiveCalculatorView } from './InteractiveCalculatorView';
import { DynamicToolForm } from './DynamicToolForm';
import { getCalculatorConfig } from '../../lib/calculatorEngines';

describe('Todo 1: Calculator Clause Injection & Smooth Transition to Document Generator', () => {
  it('triggers onSendToDocument callback with legal clause when clicking the button in InteractiveCalculatorView', () => {
    const config = getCalculatorConfig('CHILD_SUPPORT_CALCULATOR');
    expect(config).toBeDefined();
    if (!config) return;

    const onSendToDocument = vi.fn();
    render(
      <InteractiveCalculatorView 
        config={config} 
        onSendToDocument={onSendToDocument} 
      />
    );

    const sendBtn = screen.getByRole('button', { name: /帶入書狀產生器/ });
    expect(sendBtn).toBeInTheDocument();
    fireEvent.click(sendBtn);

    expect(onSendToDocument).toHaveBeenCalledTimes(1);
    expect(onSendToDocument).toHaveBeenCalledWith(expect.stringContaining('未成年子女'));
  });

  it('renders injected clause notice banner and allows dismissing it in DynamicToolForm', () => {
    const onClearNotice = vi.fn();
    const onChange = vi.fn();
    const testNotice = '已成功將「扶養費計算機」的試算條款帶入【離婚協議書起草】！';

    const { rerender } = render(
      <DynamicToolForm
        toolId="DIVORCE_AGREEMENT"
        formInputs={{ incidentDetails: '【試算約定條款】\n每月扶養費新台幣15,000元' }}
        onChange={onChange}
        currentToolName="離婚協議書起草"
        injectedClauseNotice={testNotice}
        onClearInjectedNotice={onClearNotice}
      />
    );

    expect(screen.getByText(testNotice)).toBeInTheDocument();
    const closeBtn = screen.getByRole('button', { name: '關閉提示' });
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);
    expect(onClearNotice).toHaveBeenCalledTimes(1);

    // 重新渲染已清除狀態
    rerender(
      <DynamicToolForm
        toolId="DIVORCE_AGREEMENT"
        formInputs={{ incidentDetails: '【試算約定條款】\n每月扶養費新台幣15,000元' }}
        onChange={onChange}
        currentToolName="離婚協議書起草"
        injectedClauseNotice={null}
        onClearInjectedNotice={onClearNotice}
      />
    );

    expect(screen.queryByText(testNotice)).not.toBeInTheDocument();
  });
});
