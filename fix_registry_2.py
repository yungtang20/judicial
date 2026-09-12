import sys

with open('src/lib/legalToolRegistry.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "id: 'OFFICIAL_TEMPLATES'" in line:
        # We know the object ends soon
        for j in range(i, i+10):
            if lines[j].strip() == "}":
                lines[j] = "  }\n];\n\nexport const LEGAL_TOOLS: ToolDefinition[] = [\n"
                break
        break

with open('src/lib/legalToolRegistry.ts', 'w', encoding='utf-8') as f:
    f.writelines(lines)
