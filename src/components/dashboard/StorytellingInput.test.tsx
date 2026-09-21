import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import StorytellingInput from './StorytellingInput';

describe('StorytellingInput', () => {
  it('supports colloquial input, file entry and voice hook', () => {
    const onChange = vi.fn();
    const onVoiceInput = vi.fn();
    render(<StorytellingInput value="房客欠租" onChange={onChange} onSubmit={vi.fn()} onVoiceInput={onVoiceInput} />);
    expect(screen.getByRole('textbox')).toHaveValue('房客欠租');
    expect(screen.getByRole('button', { name: /上傳判決書/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /語音輸入/ }));
    expect(onVoiceInput).toHaveBeenCalledOnce();
  });
});
