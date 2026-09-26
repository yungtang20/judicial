import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AttachmentHeaderFields } from './AttachmentHeaderFields';

const values = {
  attachmentText: '附件',
  courtName: '臺灣高等法院',
  year: '112',
  word: '重上',
  caseNo: '123',
  submitter: '上訴人 王小明',
  submitDate: '112年12月25日'
};

describe('AttachmentHeaderFields', () => {
  it('renders the shared header and forwards field changes', () => {
    const onChange = vi.fn();
    render(<AttachmentHeaderFields values={values} onChange={onChange}><span>當事人欄位</span></AttachmentHeaderFields>);

    expect(screen.getByText('當事人欄位')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('附件'), { target: { value: '附表二' } });
    expect(onChange).toHaveBeenCalledWith('attachmentText', '附表二');
  });
});
