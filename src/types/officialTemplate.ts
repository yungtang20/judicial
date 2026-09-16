/**
 * Type definitions for the Official Judicial Template System
 */

export type TemplateStatus =
  | 'DOWNLOADED'
  | 'NEEDS_FIELD_MAPPING'
  | 'READY_FOR_MERGE'
  | 'SOURCE_ONLY'
  | 'OUTDATED'
  | 'DOWNLOAD_FAILED';

export interface OfficialTemplateField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'select';
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: { label: string; value: string }[];
}

export interface OfficialTemplateFieldMapping {
  key: string;
  /** Exactly one locator kind must be set. */
  odtStyle?: string;
  odtParagraphStyle?: string;
  literalText?: string;
  /** 1-based occurrence when the same locator text/style is reused. */
  occurrence?: number;
  /** Reviewed text guard; mandatory for paragraph locators. */
  expectedText?: string;
  prefix?: string;
  suffix?: string;
}

export interface OfficialTemplate {
  id: string;
  category: string;
  code: string;
  name: string;
  sourcePageUrl: string;
  editableFileUrl: string | null;
  pdfFileUrl: string | null;
  officialUpdatedAt: string;
  localFilePath: string | null;
  localFileHash: string | null;
  templateStatus: TemplateStatus;
  fields: OfficialTemplateField[];
  fieldMappings?: OfficialTemplateFieldMapping[];
  fieldMappingHash?: string;
  downloadedAt: string | null;
}

export interface OfficialTemplateManifest {
  verifiedOn: string;
  totalTemplates: number;
  templates: OfficialTemplate[];
}

export interface RenderTemplateRequest {
  fields: Record<string, string>;
}

export interface RenderTemplateResponse {
  success: boolean;
  documentBase64?: string;
  fileName?: string;
  mimeType?: string;
  documentText?: string;
  verification?: {
    totalCitationsChecked?: number;
    ghostCitationsFound?: number;
    sourceHash?: string;
    artifactHash?: string;
    artifactIntegrity?: 'VERIFIED';
  };
  error?: string;
  code?: string;
  missingFields?: string[];
}
