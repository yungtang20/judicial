import os

filepath = 'src/components/toolbox/ToolResultPanel.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = """        {/* 書狀內文預覽：手機版 p-4 避免兩側過多留白被擠壓，字體 14px~16px 舒適閱讀 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[var(--color-surface-overlay)] print-container">"""

replacement = """        {/* 格式自動校對面板 */}
        {currentTool.toolType === 'generator' && (
          <div className="px-4 sm:px-6 md:px-8 pt-4 bg-[var(--color-surface-overlay)]">
            <FormatCheckerDisplay documentText={result.documentText} />
          </div>
        )}

        {/* 書狀內文預覽：手機版 p-4 避免兩側過多留白被擠壓，字體 14px~16px 舒適閱讀 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[var(--color-surface-overlay)] print-container">"""

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
