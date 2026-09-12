import sys

with open('src/lib/legalToolRegistry.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "legalBasis: '強制執行法'" in line:
        if i + 1 < len(lines) and lines[i+1].strip() == "}":
            lines[i+1] = "  },\n"

with open('src/lib/legalToolRegistry.ts', 'w', encoding='utf-8') as f:
    f.writelines(lines)
