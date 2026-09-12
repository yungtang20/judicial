/**
 * 鼎川法律工具箱標準資料定義
 * 整合：即時試算評估計算機 (Calculator) + 專業法律指引與法條說明 (Guide) + 標準契約書狀條款 (Generator)
 */

export type ToolType = 'calculator' | 'assessment' | 'generator';

export type CategoryGroupId = 'FAMILY' | 'DEBT' | 'TRAFFIC' | 'LABOR_CRIMINAL_CONTRACT' | 'OFFICIAL_TEMPLATES';

export interface ToolDefinition {
  id: string;
  categoryGroup: CategoryGroupId;
  categoryLabel: string;
  name: string;
  shortDesc: string;
  badge: string;
  toolType: ToolType;
  icon: any;
  legalBasis: string;
  isNew?: boolean;
}

export interface CalculatorField {
  id: string;
  label: string;
  type: 'number' | 'select' | 'text' | 'currency' | 'date';
  defaultValue: any;
  options?: { label: string; value: any; subtitle?: string }[];
  helperText?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface LegalGuideSection {
  title: string;
  content: string;
  statutes?: { title: string; article: string; text: string }[];
  practicalTips?: string[];
  risksToAvoid?: string[];
}

export interface LegalCalculatorConfig {
  toolId: string;
  title: string;
  subtitle: string;
  category: CategoryGroupId;
  categoryName: string;
  inputs: CalculatorField[];
  calculate: (inputs: Record<string, any>) => {
    summary: { label: string; value: string; isHighlight?: boolean; note?: string }[];
    breakdown?: { label: string; value: string }[];
    legalClause: string;
    notice?: string;
  };
  guide: LegalGuideSection[];
}
