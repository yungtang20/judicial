import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getActiveCase, useCaseStore } from '../store/useCaseStore';
import EvidenceListGenerator from './EvidenceListGenerator';

describe('EvidenceListGenerator', () => {
  beforeEach(() => {
    useCaseStore.setState({
      activeCaseId: 'active-case',
      cases: {
        'active-case': {
          schemaVersion: 1,
          caseId: 'active-case',
          workflowStage: 'INGEST',
          facts: '',
          issues: [],
          evidences: [],
          candidateCitations: [],
          deadlines: [],
          documents: [],
          updatedAt: new Date(0).toISOString()
        }
      }
    });
  });

  it('uses the issue summary seed and synchronizes it to the canonical case', async () => {
    render(<EvidenceListGenerator initialIssueSummary="借貸關係是否成立" />);

    expect(await screen.findByDisplayValue('借貸關係是否成立')).toBeInTheDocument();
    await waitFor(() => {
      expect(getActiveCase(useCaseStore.getState()).evidences).toEqual([
        expect.objectContaining({ relatedIssue: '借貸關係是否成立' })
      ]);
    });
  });

  it('does not recreate a deleted seed row after unmount and remount', async () => {
    const { unmount } = render(<EvidenceListGenerator initialIssueSummary="借貸關係是否成立" />);
    await screen.findByDisplayValue('借貸關係是否成立');
    await waitFor(() => expect(getActiveCase(useCaseStore.getState()).evidences).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: '✖ 刪除' }));
    await waitFor(() => expect(getActiveCase(useCaseStore.getState()).evidences).toEqual([]));
    expect(screen.queryByDisplayValue('借貸關係是否成立')).not.toBeInTheDocument();

    unmount();
    render(<EvidenceListGenerator initialIssueSummary="借貸關係是否成立" />);

    expect(screen.queryByDisplayValue('借貸關係是否成立')).not.toBeInTheDocument();
    await waitFor(() => expect(getActiveCase(useCaseStore.getState()).evidences).toEqual([]));
  });

  it('leaves canonical evidence unseeded when no issue summary is provided', async () => {
    render(<EvidenceListGenerator />);

    expect(screen.queryByDisplayValue(/原告主張/)).not.toBeInTheDocument();
    await waitFor(() => expect(getActiveCase(useCaseStore.getState()).evidences).toEqual([]));
  });
});
