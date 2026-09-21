export interface SyllogismInput {
  majorPremise: string;
  minorPremise: string;
  conclusion: string;
  mcpCitationIds: string[];
}

export interface SyllogismResult extends SyllogismInput {
  valid: boolean;
}

/** Keeps legal reasoning structured; it does not invent or validate legal sources. */
export function buildSyllogismResult(input: SyllogismInput): SyllogismResult {
  const fields = [input.majorPremise, input.minorPremise, input.conclusion];
  const valid = fields.every(value => value.trim().length > 0) && input.mcpCitationIds.length > 0;
  return { ...input, mcpCitationIds: [...input.mcpCitationIds], valid };
}
