import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecentUsage } from './RecentUsage';
import { ToolProvider, useToolContext } from '../contexts/ToolContext';

function RouteProbe() {
  const { route } = useToolContext();
  return <span data-testid="route-view">{route.view}</span>;
}

describe('RecentUsage', () => {
  beforeEach(() => localStorage.clear());

  it('migrates legacy tool records to the route schema without losing history', () => {
    localStorage.setItem('recent_tools', JSON.stringify([
      { toolId: 'COURT_FEE_CALCULATOR', label: '舊的裁判費試算工具', timestamp: 1 }
    ]));

    render(
      <ToolProvider>
        <RouteProbe />
        <RecentUsage />
      </ToolProvider>
    );

    expect(screen.getByText('舊的裁判費試算工具')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('recent_tools') || '[]')).toEqual([
      { route: { view: 'litigation', section: 'toolbox' }, label: '舊的裁判費試算工具', timestamp: 1 }
    ]);

    fireEvent.click(screen.getByRole('button', { name: /舊的裁判費試算工具/ }));

    expect(screen.getByTestId('route-view')).toHaveTextContent('litigation');
  });
});
