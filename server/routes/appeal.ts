import { Router, Request, Response } from "express";
import { findUnreadRetrievedCitations } from "../../src/domain/case/citationGate.js";
import { executeCanonicalPleadingPipeline } from "../services/canonicalPleadingPipeline.js";

const router = Router();

function joinedValues(value: unknown, keys: string[]): string {
  if (!Array.isArray(value)) return '';
  return value.flatMap(item => {
    if (typeof item === 'string') return item.trim() ? [item.trim()] : [];
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    return keys.flatMap(key => typeof record[key] === 'string' && record[key].trim() ? [record[key].trim()] : []);
  }).join('\n');
}

function appealCategory(body: Record<string, unknown>): string | null {
  const caseType = body.caseType === 'administrative' ? 'administrative_litigation' : body.caseType;
  if (caseType === 'administrative_litigation') return 'ADMINISTRATIVE_APPEAL';
  if (body.appealLevel !== 'SECOND' && body.appealLevel !== 'THIRD') return null;
  if (caseType === 'criminal') {
    return body.appealLevel === 'SECOND' ? 'CRIMINAL_APPEAL_SECOND' : 'CRIMINAL_APPEAL_THIRD';
  }
  if (caseType !== 'civil') return null;
  if (body.appealLevel === 'SECOND') return 'CIVIL_APPEAL_SECOND';
  if (body.appealGroundType === 'STATUTORY') return 'CIVIL_APPEAL_THIRD_STATUTORY';
  if (body.appealGroundType === 'PRINCIPLED_IMPORTANCE') return 'CIVIL_APPEAL_THIRD_PRINCIPLED';
  return null;
}

router.post("/api/generate-appeal-petition", async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  const unreadCitations = findUnreadRetrievedCitations(req.body?.selectedPrecedents);
  if (unreadCitations.length) {
    return res.status(422).json({
      error: '檢索裁判尚未取得全文，拒絕將未讀取來源帶入生成',
      code: 'CITATION_FULLTEXT_REQUIRED',
      citations: unreadCitations.map(item => item.citation)
    });
  }
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? req.body as Record<string, unknown>
    : {};
  const category = appealCategory(body);
  if (!category) {
    return res.status(422).json({
      error: '必須提供已核准的案件類型、上訴審級及第三審上訴路徑。',
      code: 'PLEADING_DISCRIMINATOR_REQUIRED'
    });
  }

  const params = {
    ...body,
    courtName: body.courtName,
    plaintiffName: body.appellantName,
    plaintiffAddress: body.appellantAddress,
    defendantName: body.appelleeName,
    defendantAddress: body.appelleeAddress,
    legalRepresentativeName: body.appellantLegalRep,
    legalRepresentativeAddress: body.appellantLegalRepAddress,
    legalRepresentativeRelationship: body.appellantLegalRepRelationship,
    claimStatement: body.appealDisposition || body.claims,
    appealDisposition: body.appealDisposition || body.claims,
    appealReasons: body.appealReasons || joinedValues(body.issues, ['appealArgument']),
    evidenceList: body.evidenceList || joinedValues(body.evidences, ['code', 'provenFact', 'investigationItem'])
  };

  try {
    const result = await executeCanonicalPleadingPipeline(category, params);
    return res.json({ ...result, petitionText: result.documentText });
  } catch (error: any) {
    return res.status(422).json({
      error: error?.message || '上訴書狀未通過 P4-P9 Final Gate。',
      code: error?.code || 'P9_FINAL_GATE_FAILED',
      ...(Array.isArray(error?.missingInputs) ? { missingInputs: error.missingInputs } : {})
    });
  }
});

export default router;
