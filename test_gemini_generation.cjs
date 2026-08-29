const assert = require('node:assert/strict');

async function run() {
  const { generateContentWithFallback } = await import('./src/lib/geminiGeneration.ts');
  const calls = [];
  const ai = { models: { generateContent: async (request) => {
    calls.push(request);
    if (request.config?.tools) throw new Error('search unavailable');
    return { text: 'plain result' };
  } } };
  const result = await generateContentWithFallback(ai, 'prompt', true, {
    models: ['test-model'],
    sleep: async () => {}
  });
  assert.equal(result.text, 'plain result');
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].config.tools, [{ googleSearch: {} }]);
  assert.equal(calls[1].config.tools, undefined);

  const grounded = await generateContentWithFallback({ models: { generateContent: async (request) => ({ text: request.config.tools ? 'grounded result' : 'plain result' }) } }, 'prompt', true, {
    models: ['test-model'],
    sleep: async () => {}
  });
  assert.deepEqual(Object.keys(grounded).sort(), ['modelUsed', 'text']);
  assert.equal(grounded.text, 'grounded result');

  await assert.rejects(
    () => generateContentWithFallback({ models: { generateContent: async () => { throw new Error('all models down'); } } }, 'prompt', true, {
      models: ['only-model'],
      sleep: async () => {}
    }),
    /all models down/
  );
}

run().then(() => console.log('Gemini generation tests passed'));
