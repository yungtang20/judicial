import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  getTemplateById,
  updateTemplateP9Status,
} from '../src/lib/officialTemplateManifest.js';
import {
  verifyOfficialTemplateSource,
  verifyTemplateArtifactAndMapping,
} from '../src/lib/officialTemplateArtifactVerifier.js';
import { renderTemplate } from '../src/lib/officialTemplateRenderer.js';
import { getOfficialTemplateRuleProfile } from '../src/lib/rules/officialTemplateRuleProfiles.js';
import {
  executeOfficialTemplatePleadingPipeline,
  OfficialTemplatePleadingPipelineError,
} from '../server/services/officialTemplatePleadingPipeline.js';

export class OfficialTemplateP9VerificationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'OfficialTemplateP9VerificationError';
  }
}

export type VerifyOfficialTemplateP9Options = {
  templateId: string;
  values: Record<string, string>;
};

function readSource(template: NonNullable<ReturnType<typeof getTemplateById>>): Buffer {
  if (!template.localFilePath) {
    throw new OfficialTemplateP9VerificationError('SOURCE_MISSING', '官方範本沒有本機來源檔案。');
  }
  const filePath = path.resolve(process.cwd(), template.localFilePath);
  if (!fs.existsSync(filePath)) {
    throw new OfficialTemplateP9VerificationError('SOURCE_MISSING', '官方範本來源檔案不存在。');
  }
  return fs.readFileSync(filePath);
}

/** Runs the same source, mapping, render, reviewer and P9 gate checks as production. */
export async function verifyOfficialTemplateP9(options: VerifyOfficialTemplateP9Options) {
  const template = getTemplateById(options.templateId);
  if (!template) {
    throw new OfficialTemplateP9VerificationError('TEMPLATE_NOT_FOUND', `找不到官方範本：${options.templateId}`);
  }
  const profile = getOfficialTemplateRuleProfile(template.id);
  if (!profile) {
    throw new OfficialTemplateP9VerificationError('RULE_PROFILE_NOT_FOUND', '官方範本沒有已核准的 Rule Profile。');
  }

  const source = readSource(template);
  const sourceVerification = verifyOfficialTemplateSource(template);
  if (sourceVerification.status !== 'VERIFIED') {
    throw new OfficialTemplateP9VerificationError('SOURCE_HASH_DRIFT', '官方範本來源 hash 未通過驗證。');
  }
  const mapping = verifyTemplateArtifactAndMapping(template, source);
  if (mapping.mapping?.status !== 'VERIFIED') {
    throw new OfficialTemplateP9VerificationError(
      'FIELD_MAPPING_INCOMPLETE',
      `官方範本欄位 mapping 未完成：${mapping.mapping?.missingRequiredFields.join(', ') || 'UNKNOWN'}`
    );
  }

  const rendered = renderTemplate(template.id, options.values);
  if (!rendered.success || !rendered.documentBase64) {
    throw new OfficialTemplateP9VerificationError(
      rendered.code || 'RENDER_BLOCKED',
      rendered.error || '官方範本 ODT 產出失敗。'
    );
  }
  const artifact = Buffer.from(rendered.documentBase64, 'base64');
  const artifactVerification = verifyTemplateArtifactAndMapping(template, artifact, undefined);
  if (artifactVerification.status !== 'VERIFIED' || artifactVerification.mapping?.status !== 'VERIFIED') {
    throw new OfficialTemplateP9VerificationError('ARTIFACT_BLOCKED', '產出 ODT 的 integrity 或 mapping 未通過。');
  }

  const pipeline = await executeOfficialTemplatePleadingPipeline({
    template,
    values: options.values,
    artifact,
    sourceArtifact: source,
  });
  updateTemplateP9Status(template.id, 'P9_READY', {
    p9ProfileId: profile.ruleProfile.id,
    p9ProfileVersion: profile.mappingVersion,
    p9SourceHash: sourceVerification.sha256,
    p9SourceOfficialUpdatedAt: template.officialUpdatedAt,
    templateVersion: template.officialUpdatedAt,
    p9VerifiedAt: new Date().toISOString(),
  });
  return pipeline;
}

function parseArgs(argv: string[]): VerifyOfficialTemplateP9Options {
  const templateIndex = argv.indexOf('--template');
  const fieldsIndex = argv.indexOf('--fields');
  const templateId = templateIndex >= 0 ? argv[templateIndex + 1] : undefined;
  const fieldsPath = fieldsIndex >= 0 ? argv[fieldsIndex + 1] : undefined;
  if (!templateId || !fieldsPath) {
    throw new OfficialTemplateP9VerificationError('USAGE', '用法：tsx scripts/verifyOfficialTemplateP9.ts --template <id> --fields <json-path>');
  }
  return { templateId, values: JSON.parse(fs.readFileSync(path.resolve(fieldsPath), 'utf-8')) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void (async () => {
    try {
      await verifyOfficialTemplateP9(parseArgs(process.argv.slice(2)));
      console.log('P9_READY');
    } catch (error: unknown) {
      const failure = error instanceof OfficialTemplatePleadingPipelineError || error instanceof OfficialTemplateP9VerificationError
        ? error
        : new Error(String(error));
      console.error(`${failure.name}: ${failure.message}`);
      process.exitCode = 1;
    }
  })();
}
