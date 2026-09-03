/**
 * Stage Contract Specification
 * 各階段正式契約：定義前置工件、必備驗證器、審批要求與重試失敗政策
 */

import { SdlcStageId } from '../sdlc/types';

export interface StageContractDef {
  stageId: SdlcStageId;
  name: string;
  requiredArtifactCategories: Array<'intent' | 'spec' | 'plan' | 'code_or_doc' | 'test_report' | 'release_record' | 'incident_log'>;
  requiredValidatorCategories: Array<'PRIVACY' | 'SCHEMA' | 'LEGAL' | 'CITATION' | 'SECURITY'>;
  requiresHumanApproval: boolean;
  requiredRoleForApproval: 'APPROVER' | 'DEPLOYER' | 'ADMIN';
  failurePolicy: 'REJECT' | 'NEEDS_REVIEW' | 'FALLBACK_TO_PREVIOUS';
  retryLimit: number;
}

export const STAGE_CONTRACTS: Record<SdlcStageId, StageContractDef> = {
  '01_plan': {
    stageId: '01_plan',
    name: '計劃與立項 (Plan)',
    requiredArtifactCategories: ['intent'],
    requiredValidatorCategories: ['PRIVACY', 'SCHEMA'],
    requiresHumanApproval: true,
    requiredRoleForApproval: 'APPROVER',
    failurePolicy: 'REJECT',
    retryLimit: 3
  },
  '02_design': {
    stageId: '02_design',
    name: '方案與設計 (Design)',
    requiredArtifactCategories: ['spec'],
    requiredValidatorCategories: ['SCHEMA', 'LEGAL'],
    requiresHumanApproval: true,
    requiredRoleForApproval: 'APPROVER',
    failurePolicy: 'REJECT',
    retryLimit: 3
  },
  '03_build': {
    stageId: '03_build',
    name: '實現與構建 (Build)',
    requiredArtifactCategories: ['code_or_doc'],
    requiredValidatorCategories: ['PRIVACY', 'SCHEMA', 'LEGAL', 'CITATION', 'SECURITY'],
    requiresHumanApproval: true,
    requiredRoleForApproval: 'APPROVER',
    failurePolicy: 'REJECT',
    retryLimit: 3
  },
  '04_test': {
    stageId: '04_test',
    name: '測試與驗證 (Test)',
    requiredArtifactCategories: ['test_report'],
    requiredValidatorCategories: ['CITATION', 'LEGAL', 'SECURITY'],
    requiresHumanApproval: true,
    requiredRoleForApproval: 'APPROVER',
    failurePolicy: 'NEEDS_REVIEW',
    retryLimit: 3
  },
  '05_deploy': {
    stageId: '05_deploy',
    name: '發布與交付 (Deploy)',
    requiredArtifactCategories: ['release_record'],
    requiredValidatorCategories: ['PRIVACY', 'SECURITY', 'CITATION'],
    requiresHumanApproval: true,
    requiredRoleForApproval: 'DEPLOYER',
    failurePolicy: 'REJECT',
    retryLimit: 1
  },
  '06_maintain': {
    stageId: '06_maintain',
    name: '運維與改進 (Maintain)',
    requiredArtifactCategories: ['incident_log'],
    requiredValidatorCategories: ['SCHEMA'],
    requiresHumanApproval: true,
    requiredRoleForApproval: 'APPROVER',
    failurePolicy: 'FALLBACK_TO_PREVIOUS',
    retryLimit: 5
  }
};
