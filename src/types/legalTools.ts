export interface LegalCalculatorInput {
  id: string;
  label: string;
  type: 'select' | 'number' | 'text';
  defaultValue: any;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: any }>;
  helperText?: string;
}

export interface LegalCalculatorResult {
  summary: Array<{
    label: string;
    value: string;
    isHighlight?: boolean;
    note?: string;
  }>;
  breakdown?: Array<{
    label: string;
    value: string;
  }>;
  notice?: string;
  legalClause: string;
}

export interface LegalCalculatorGuideSection {
  title: string;
  content: string;
  statutes?: Array<{ name: string; content?: string }>;
}

export interface LegalCalculatorConfig {
  id: string;
  categoryName: string;
  title: string;
  subtitle: string;
  inputs: LegalCalculatorInput[];
  calculate: (inputs: Record<string, any>) => LegalCalculatorResult;
  guide: LegalCalculatorGuideSection[];
}
