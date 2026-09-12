import sys

with open('src/lib/legalToolRegistry.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add the category
cat_insertion = """  {
    id: 'LABOR_CRIMINAL_CONTRACT',
    name: '勞資 · 刑事 · 契約',
    subtitle: '資遣費、刑事告訴、租賃、買賣、消滅時效'
  },
  {
    id: 'OFFICIAL_TEMPLATES',
    name: '司法院官方範本',
    subtitle: '民事、刑事、行政、家事、強制執行等官方書狀產製'
  }"""
content = content.replace("""  {
    id: 'LABOR_CRIMINAL_CONTRACT',
    name: '勞資 · 刑事 · 契約',
    subtitle: '資遣費、刑事告訴、租賃、買賣、消滅時效'
  }""", cat_insertion)

# Add the tools
tools_insertion = """  // ==========================================
  // 分類五：司法院官方範本整合 (5項)
  // ==========================================
  {
    id: 'JUDICIAL_CIVIL_TEMPLATE',
    categoryGroup: 'OFFICIAL_TEMPLATES',
    categoryLabel: '司法院官方範本',
    name: '民事訴訟書狀（司法院標準）',
    shortDesc: '支援民事起訴、答辯、聲請、陳報、上訴狀等，內建司法院法定必備記載事項與格式。',
    badge: '官方整合',
    toolType: 'generator',
    icon: Scale,
    legalBasis: '民事訴訟法第116條'
  },
  {
    id: 'JUDICIAL_CRIMINAL_TEMPLATE',
    categoryGroup: 'OFFICIAL_TEMPLATES',
    categoryLabel: '司法院官方範本',
    name: '刑事訴訟書狀（司法院標準）',
    shortDesc: '支援刑事告訴、答辯、附帶民事起訴、聲請調查證據等格式，嚴格遵守司法狀紙要點。',
    badge: '官方整合',
    toolType: 'generator',
    icon: ShieldCheck,
    legalBasis: '刑事訴訟法、司法狀紙要點'
  },
  {
    id: 'JUDICIAL_ADMIN_TEMPLATE',
    categoryGroup: 'OFFICIAL_TEMPLATES',
    categoryLabel: '司法院官方範本',
    name: '行政訴訟書狀（司法院標準）',
    shortDesc: '支援撤銷訴訟、課予義務訴訟、確認訴訟及交通裁決事件起訴狀等行政訴訟法定格式。',
    badge: '官方整合',
    toolType: 'generator',
    icon: FileCheck2,
    legalBasis: '行政訴訟法第57條'
  },
  {
    id: 'JUDICIAL_FAMILY_TEMPLATE',
    categoryGroup: 'OFFICIAL_TEMPLATES',
    categoryLabel: '司法院官方範本',
    name: '家事事件書狀（司法院標準）',
    shortDesc: '支援保護令聲請、未成年子女親權、扶養費、拋棄繼承等家事聲請狀法定標準格式。',
    badge: '官方整合',
    toolType: 'generator',
    icon: Users,
    legalBasis: '家事事件法'
  },
  {
    id: 'JUDICIAL_EXECUTION_TEMPLATE',
    categoryGroup: 'OFFICIAL_TEMPLATES',
    categoryLabel: '司法院官方範本',
    name: '強制執行書狀（司法院標準）',
    shortDesc: '支援聲請強制執行、查封、拍賣、聲明異議、參與分配等強執法定聲明格式。',
    badge: '官方整合',
    toolType: 'generator',
    icon: Gavel,
    legalBasis: '強制執行法'
  }
];"""
content = content.replace("];", tools_insertion)

with open('src/lib/legalToolRegistry.ts', 'w', encoding='utf-8') as f:
    f.write(content)
