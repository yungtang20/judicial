import sys, re

with open('src/lib/toolFieldSchemas.ts', 'r', encoding='utf-8') as f:
    content = f.read()

schemas = """  "JUDICIAL_CIVIL_TEMPLATE": [
    { "key": "templateName", "label": "所需司法院書狀名稱 (例如：民事起訴狀、民事答辯狀)", "type": "text", "showAiSuggest": True },
    { "key": "caseContext", "label": "案件事實與請求內容", "type": "textarea", "rows": 4, "showAiSuggest": True },
    { "key": "evidenceList", "label": "相關證據清單 (證物名稱)", "type": "textarea", "rows": 2, "showAiSuggest": True }
  ],
  "JUDICIAL_CRIMINAL_TEMPLATE": [
    { "key": "templateName", "label": "所需司法院書狀名稱 (例如：刑事告訴狀、刑事附帶民事訴訟起訴狀)", "type": "text", "showAiSuggest": True },
    { "key": "caseContext", "label": "案件事實與訴求", "type": "textarea", "rows": 4, "showAiSuggest": True },
    { "key": "evidenceList", "label": "相關證據清單 (證物名稱)", "type": "textarea", "rows": 2, "showAiSuggest": True }
  ],
  "JUDICIAL_ADMIN_TEMPLATE": [
    { "key": "templateName", "label": "所需司法院書狀名稱 (例如：行政訴訟起訴狀、交通裁決起訴狀)", "type": "text", "showAiSuggest": True },
    { "key": "caseContext", "label": "案件事實與訴求", "type": "textarea", "rows": 4, "showAiSuggest": True },
    { "key": "evidenceList", "label": "相關證據清單 (證物名稱)", "type": "textarea", "rows": 2, "showAiSuggest": True }
  ],
  "JUDICIAL_FAMILY_TEMPLATE": [
    { "key": "templateName", "label": "所需司法院書狀名稱 (例如：家事聲請狀-常態保護令、拋棄繼承)", "type": "text", "showAiSuggest": True },
    { "key": "caseContext", "label": "案件事實與訴求", "type": "textarea", "rows": 4, "showAiSuggest": True },
    { "key": "evidenceList", "label": "相關證據清單 (證物名稱)", "type": "textarea", "rows": 2, "showAiSuggest": True }
  ],
  "JUDICIAL_EXECUTION_TEMPLATE": [
    { "key": "templateName", "label": "所需司法院書狀名稱 (例如：民事聲請強制執行狀、聲明異議狀)", "type": "text", "showAiSuggest": True },
    { "key": "caseContext", "label": "案件事實與執行標的說明", "type": "textarea", "rows": 4, "showAiSuggest": True },
    { "key": "evidenceList", "label": "相關證據清單 (執行名義、財產清單)", "type": "textarea", "rows": 2, "showAiSuggest": True }
  ],
"""

content = content.replace("export const TOOL_FIELD_SCHEMAS: Record<string, ToolFieldDef[]> = {\n", "export const TOOL_FIELD_SCHEMAS: Record<string, ToolFieldDef[]> = {\n" + schemas.replace("True", "true"))

with open('src/lib/toolFieldSchemas.ts', 'w', encoding='utf-8') as f:
    f.write(content)
