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

export type OfficialTemplateP9Status =
  | 'P9_NOT_CONFIGURED'
  | 'P9_BLOCKED'
  | 'P9_READY';

export interface OfficialTemplateField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'select';
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: { label: string; value: string }[];
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
  /** Version of the official source captured by the manifest. */
  templateVersion?: string;
  p9Status?: OfficialTemplateP9Status;
  p9ProfileId?: string;
  p9ProfileVersion?: string;
  p9SourceHash?: string;
  p9SourceOfficialUpdatedAt?: string;
  p9VerifiedAt?: string;
  fields: OfficialTemplateField[];
  downloadedAt: string | null;
}

export interface OfficialTemplateManifest {
  verifiedOn: string | null;
  totalTemplates: number;
  templates: OfficialTemplate[];
}

export interface RenderTemplateRequest {
  fields: Record<string, string>;
}

export interface RenderTemplateResponse {
  success: boolean;
  documentText?: string;
  documentBase64?: string;
  fileName?: string;
  mimeType?: string;
  verification?: {
    totalCitationsChecked: number;
    ghostCitationsFound: number;
  };
  artifactFingerprint?: string;
  error?: string;
  code?: string;
  missingFields?: string[];
}
