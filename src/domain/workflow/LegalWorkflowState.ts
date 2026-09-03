/**
 * Legal Workflow State Machine
 * 
 * 依照規格要求，完整實作法律文件生成的狀態機機制，
 * 確保文件在各階段之間流轉時有明確的 Guardrails，不會發生跳階 (bypassing)。
 */

export enum LegalWorkflowState {
  RECEIVED = "RECEIVED",
  PRECHECKED = "PRECHECKED",
  CLASSIFIED = "CLASSIFIED",
  RETRIEVED = "RETRIEVED",
  ANALYZED = "ANALYZED",
  GENERATED = "GENERATED",
  VERIFIED = "VERIFIED",
  APPROVED = "APPROVED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED"
}

export interface WorkflowContext {
  state: LegalWorkflowState;
  id: string;
  input: string;
  metadata?: Record<string, any>;
  retrievalResults?: any[];
  generatedDraft?: string;
  verificationReport?: any;
  error?: Error;
}

export class LegalWorkflowEngine {
  private context: WorkflowContext;

  constructor(id: string, input: string) {
    this.context = {
      id,
      input,
      state: LegalWorkflowState.RECEIVED,
      metadata: {}
    };
  }

  public getContext(): WorkflowContext {
    return { ...this.context };
  }

  public getState(): LegalWorkflowState {
    return this.context.state;
  }

  private assertState(expected: LegalWorkflowState) {
    if (this.context.state !== expected) {
      throw new Error(`Invalid state transition. Expected ${expected}, but got ${this.context.state}`);
    }
  }

  public async runPrecheck(precheckFn: (input: string) => boolean | Promise<boolean>) {
    this.assertState(LegalWorkflowState.RECEIVED);
    try {
      const passed = await precheckFn(this.context.input);
      if (!passed) {
        throw new Error("Precheck failed");
      }
      this.context.state = LegalWorkflowState.PRECHECKED;
    } catch (e: any) {
      this.context.state = LegalWorkflowState.FAILED;
      this.context.error = e;
      throw e;
    }
  }

  public async runClassification(classifyFn: (input: string) => any) {
    this.assertState(LegalWorkflowState.PRECHECKED);
    try {
      const classification = await classifyFn(this.context.input);
      this.context.metadata = { ...this.context.metadata, classification };
      this.context.state = LegalWorkflowState.CLASSIFIED;
    } catch (e: any) {
      this.context.state = LegalWorkflowState.FAILED;
      this.context.error = e;
      throw e;
    }
  }

  public async runRetrieval(retrieveFn: (query: string) => any) {
    this.assertState(LegalWorkflowState.CLASSIFIED);
    try {
      const query = this.context.metadata?.classification?.query || this.context.input;
      this.context.retrievalResults = await retrieveFn(query);
      this.context.state = LegalWorkflowState.RETRIEVED;
    } catch (e: any) {
      this.context.state = LegalWorkflowState.FAILED;
      this.context.error = e;
      throw e;
    }
  }

  public async runAnalysis(analyzeFn: (context: WorkflowContext) => any) {
    this.assertState(LegalWorkflowState.RETRIEVED);
    try {
      const analysis = await analyzeFn(this.context);
      this.context.metadata = { ...this.context.metadata, analysis };
      this.context.state = LegalWorkflowState.ANALYZED;
    } catch (e: any) {
      this.context.state = LegalWorkflowState.FAILED;
      this.context.error = e;
      throw e;
    }
  }

  public async runGeneration(generateFn: (context: WorkflowContext) => Promise<string>) {
    this.assertState(LegalWorkflowState.ANALYZED);
    try {
      this.context.generatedDraft = await generateFn(this.context);
      this.context.state = LegalWorkflowState.GENERATED;
    } catch (e: any) {
      this.context.state = LegalWorkflowState.FAILED;
      this.context.error = e;
      throw e;
    }
  }

  public async runVerification(verifyFn: (draft: string, context: WorkflowContext) => any) {
    this.assertState(LegalWorkflowState.GENERATED);
    try {
      const report = await verifyFn(this.context.generatedDraft!, this.context);
      this.context.verificationReport = report;
      this.context.state = LegalWorkflowState.VERIFIED;
    } catch (e: any) {
      this.context.state = LegalWorkflowState.FAILED;
      this.context.error = e;
      throw e;
    }
  }

  public async runApproval(approveFn: (report: any) => boolean) {
    this.assertState(LegalWorkflowState.VERIFIED);
    try {
      const approved = await approveFn(this.context.verificationReport);
      if (!approved) {
        throw new Error("Document rejected during approval gate");
      }
      this.context.state = LegalWorkflowState.APPROVED;
    } catch (e: any) {
      this.context.state = LegalWorkflowState.FAILED;
      this.context.error = e;
      throw e;
    }
  }

  public complete() {
    this.assertState(LegalWorkflowState.APPROVED);
    this.context.state = LegalWorkflowState.COMPLETED;
    return this.getContext();
  }
}
