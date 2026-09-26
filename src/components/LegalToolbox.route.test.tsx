import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GlobalUIProvider } from '../contexts/GlobalUIContext';
import { LegalToolbox } from './LegalToolbox';

describe('LegalToolbox route handoff', () => {
  it('prefills facts and the reviewed AI draft from typed handoff data', () => {
    render(
      <GlobalUIProvider>
        <LegalToolbox
          initialToolId="UNIVERSAL_AI_PLEADING"
          initialFacts="房東未退還押金"
          formSeed={{ pleadingText: "請人工確認後再產製" }}
        />
      </GlobalUIProvider>
    );

    expect(screen.getByPlaceholderText('請輸入爭議具體經過與事實細節...')).toHaveValue('房東未退還押金');
    expect(screen.getByPlaceholderText('請輸入AI 草稿（請人工確認後再產製）...')).toHaveValue('請人工確認後再產製');
  });
});
