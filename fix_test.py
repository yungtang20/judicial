import re

with open('src/components/toolbox/ToolboxClassification.test.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the 4 categories check with 5 categories
content = content.replace("['FAMILY', 'DEBT', 'TRAFFIC', 'LABOR_CRIMINAL_CONTRACT']", "['FAMILY', 'DEBT', 'TRAFFIC', 'LABOR_CRIMINAL_CONTRACT', 'OFFICIAL_TEMPLATES']")
content = content.replace("offers the 4 consistent life-situation categories matching Dingchuan layout", "offers the 5 consistent life-situation categories matching Dingchuan layout")
content = content.replace("assigns every tool to one of the 4 supported categories", "assigns every tool to one of the 5 supported categories")

with open('src/components/toolbox/ToolboxClassification.test.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
