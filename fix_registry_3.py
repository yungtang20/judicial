import sys

with open('src/lib/legalToolRegistry.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
tools_to_move = []

in_first_tools = False
for line in lines:
    if line.strip() == "export const LEGAL_TOOLS: ToolDefinition[] = [" and not in_first_tools:
        in_first_tools = True
        continue
    
    if in_first_tools:
        if line.strip() == "export const LEGAL_TOOLS: ToolDefinition[] = [":
            in_first_tools = False # second one found
            new_lines.append(line)
            # Append the extracted tools right after the second declaration
            new_lines.extend(tools_to_move)
        else:
            if line.strip() == "];":
                pass
            else:
                tools_to_move.append(line)
    else:
        new_lines.append(line)

with open('src/lib/legalToolRegistry.ts', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
