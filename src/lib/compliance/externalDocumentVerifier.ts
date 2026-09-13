import type { ComplianceFinding } from '../../types/compliance';

export interface ExternalDocumentInput {
  fileType: 'DOCX' | 'PDF';
  bytes: Uint8Array;
}

/** Physical DOCX/PDF layout parsing is outside the generated-document P5 scope. */
export function verifyExternalDocument(_document: ExternalDocumentInput): ComplianceFinding[] {
  return [{
    ruleId: 'EXTERNAL_DOCUMENT_FORMAT',
    status: 'UNVERIFIED',
    note: '尚未執行外部 DOCX/PDF 實體版面解析；不得推定格式合規。'
  }];
}
