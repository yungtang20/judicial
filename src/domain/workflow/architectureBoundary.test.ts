import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Architecture Boundary Static Verification', () => {
  const rootDir = process.cwd();

  it('ensures server/routes/sdlc.ts does not directly import @google/genai', () => {
    const routeFile = path.join(rootDir, 'server', 'routes', 'sdlc.ts');
    const content = fs.readFileSync(routeFile, 'utf-8');

    expect(content).not.toContain('@google/genai');
    expect(content).not.toContain('new GoogleGenAI');
    expect(content).toContain('defaultSdlcOrchestrator');
  });

  it('ensures src/domain/workflow does not directly import express or @google/genai', () => {
    const workflowDir = path.join(rootDir, 'src', 'domain', 'workflow');
    const files = fs.readdirSync(workflowDir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));

    for (const file of files) {
      const filePath = path.join(workflowDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content, `File ${file} should not import express`).not.toContain("from 'express'");
      expect(content, `File ${file} should not import @google/genai`).not.toContain('@google/genai');
    }
  });

  it('ensures src/domain/sdlc does not directly import @google/genai or express', () => {
    const sdlcDir = path.join(rootDir, 'src', 'domain', 'sdlc');
    const files = fs.readdirSync(sdlcDir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));

    for (const file of files) {
      const filePath = path.join(sdlcDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content, `File ${file} should not import express`).not.toContain("from 'express'");
      expect(content, `File ${file} should not import @google/genai`).not.toContain('@google/genai');
    }
  });
});
