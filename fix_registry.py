import sys

with open('src/lib/legalToolRegistry.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "legalBasis: '民法第125條至第127條、刑法第80條'" in line:
        if i + 1 < len(lines) and lines[i+1].strip() == "}":
            lines[i+1] = "  },\n"

with open('src/lib/legalToolRegistry.ts', 'w', encoding='utf-8') as f:
    f.writelines(lines)
