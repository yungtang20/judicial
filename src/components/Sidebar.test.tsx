import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToolProvider, useToolContext } from '../contexts/ToolContext';
import Sidebar from './Sidebar';

/**
 * 側邊欄的資訊架構約束。
 *
 * 這些斷言不是樣式測試，而是把重構的理由固定下來：
 *
 * 1. 主要入口用「一般民眾答得出來的問句」，不是功能模組名稱。
 *    先前列出 13 個工具是依模組組織，
 *    但使用者的思考是「我現在該做什麼」。
 *
 * 2. SDLC 交付工作台是軟體工程工具，與解決法律問題無關，
 *    不得出現在使用者介面（元件與路由本身保留）。
 *
 * 3. 不得有「核心功能」與「常用功能」兩個內容重疊的區塊——
 *    先前同一批工具並列出現兩次，使用者無從判斷兩區差異。
 *
 * 4. 計算型與查核型工具收到次要工具區，不與主要流程競爭注意力。
 */
describe('Sidebar 的資訊架構', () => {
  const renderSidebar = (extra?: React.ReactNode) =>
    render(<ToolProvider><Sidebar />{extra}</ToolProvider>);

  it('主要入口使用民眾答得出來的問句', () => {
    renderSidebar();
    expect(screen.getByText('我遇到問題要處理')).toBeInTheDocument();
    expect(screen.getByText('我收到判決書了')).toBeInTheDocument();
    expect(screen.getByText('我要自己做一份文件')).toBeInTheDocument();
  });

  it('不再使用功能模組名稱當主要入口', () => {
    renderSidebar();
    // 先前以模組名稱呈現，一般民眾無法對應自己的處境
    expect(screen.queryByText('智慧案件分析工作台')).not.toBeInTheDocument();
    expect(screen.queryByText('全方位實用法務工具箱')).not.toBeInTheDocument();
  });

  it('軟體工程工具不得出現在使用者介面', () => {
    renderSidebar();
    // SDLC 是規劃到部署的階段閘門，與解決法律問題無關
    expect(screen.queryByText(/SDLC/)).not.toBeInTheDocument();
    expect(screen.queryByText(/階段閘門與稽核軌跡/)).not.toBeInTheDocument();
  });

  it('不得有內容重疊的兩個功能區塊', () => {
    renderSidebar();
    expect(screen.queryByText('核心功能')).not.toBeInTheDocument();
    expect(screen.queryByText('常用功能')).not.toBeInTheDocument();
    expect(screen.getByText('從這裡開始')).toBeInTheDocument();
  });

  it('每個主要入口只出現一次', () => {
    renderSidebar();
    for (const 名 of ['我遇到問題要處理', '我收到判決書了', '我要自己做一份文件']) {
      expect(screen.getAllByText(名).length, `${名} 出現多次`).toBe(1);
    }
  });

  it('次要工具收在其他工具區', () => {
    renderSidebar();
    expect(screen.getByText('其他工具')).toBeInTheDocument();
    expect(screen.getByText('檢查文件有沒有問題')).toBeInTheDocument();
    expect(screen.getByText('依案件類型看流程')).toBeInTheDocument();
    expect(screen.getByText('問一個法律問題')).toBeInTheDocument();
  });

  it('上訴流程的期限試算必須直接可見', () => {
    renderSidebar();
    // 收到判決書的人有 20 天期限，這是最急迫的資訊
    expect(screen.getByText('還有多少時間可以上訴')).toBeInTheDocument();
    expect(screen.getByText('分析判決書，擬上訴狀')).toBeInTheDocument();
  });

  it('點擊流程內的階段會導向正確路由', () => {
    const Selection = () => {
      const { route } = useToolContext();
      const section = 'section' in route ? route.section : '';
      return <output>{route.view}:{section}</output>;
    };
    render(
      <ToolProvider>
        <Sidebar />
        <Selection />
      </ToolProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /還有多少時間可以上訴/ }));
    expect(screen.getByText('appeal:deadline')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /準備防守與答辯/ }));
    expect(screen.getByText('appeal:defense')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /選擇文件並填寫內容/ }));
    expect(screen.getByText('litigation:toolbox')).toBeInTheDocument();
  });

  it('主要入口的點擊會導向對應流程', () => {
    const Selection = () => {
      const { route } = useToolContext();
      return <output>{route.view}</output>;
    };
    render(
      <ToolProvider>
        <Sidebar />
        <Selection />
      </ToolProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /我收到判決書了/ }));
    expect(screen.getByText('appeal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /我遇到問題要處理/ }));
    expect(screen.getByText('analysis')).toBeInTheDocument();
  });
});
