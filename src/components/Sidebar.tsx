import React from 'react';

interface SidebarProps {
  activeTool: string;
  setActiveTool: (tool: string) => void;
}

export default function Sidebar({ activeTool, setActiveTool }: SidebarProps) {
  const navItems = [
    { id: 'smartAppeal', label: '🚀 一站式智慧上訴書狀生成系統' },
    { id: 'appealDeadline', label: '⚖️ 上訴與救濟法定期間檢視與計算' },
    { id: 'judgmentSearch', label: '自行匯入判決檢索小工具' },
    { id: 'issueTableGenerator', label: '爭點整理表格小工具' },
    { id: 'evidenceListGenerator', label: '調查證據聲請表小工具' },
  ];

  return (
    <nav className="flex-none md:w-[260px] bg-karoshi-sidebar flex flex-col border-b md:border-b-0 md:border-r border-karoshi-border">
      <header className="p-6 border-b border-karoshi-border">
        <h2 className="m-0 mb-1 text-[1.8em] font-bold text-karoshi-text leading-tight">
          法律工具箱
        </h2>
        <div className="text-[0.85em] text-karoshi-text-light">
          智慧法律書狀與訴訟輔助系統
        </div>
      </header>
      <ul className="list-none p-4 m-0 flex-grow">
        {navItems.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => setActiveTool(item.id)}
              className={`w-full text-left block py-4 px-6 text-[1.1em] font-medium transition-colors duration-200 border-l-4 ${
                activeTool === item.id
                  ? 'bg-karoshi-bg text-karoshi-text border-karoshi-accent'
                  : 'text-karoshi-text-light border-transparent hover:bg-karoshi-hover hover:text-karoshi-text'
              }`}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
