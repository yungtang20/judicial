import { describe, it, expect } from 'vitest';
import { blockProductionToolboxFallback, ProductionToolboxFallbackBlockedError } from './toolboxFallbacks';
import { LEGAL_TOOLS } from '../lib/legalToolRegistry';

describe('Toolbox Fallbacks Verification', () => {
  it('never returns a substitute document from the production fallback path', () => {
    for (const tool of LEGAL_TOOLS) {
      expect(() => blockProductionToolboxFallback(tool.id)).toThrow(ProductionToolboxFallbackBlockedError);
    }
  });

  it('also fails closed for unknown categories', () => {
    expect(() => blockProductionToolboxFallback('UNKNOWN_TOOL')).toThrow(
      'no unverified substitute document may be returned'
    );
  });
});
