export function parseStrictJson(text: string): Record<string, unknown> | unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    throw new Error('Invalid JSON');
  }
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('JSON object or array required');
  }
  return parsed as Record<string, unknown> | unknown[];
}
