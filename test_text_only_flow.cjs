const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.join(__dirname, 'server.ts'), 'utf8');
const assistant = fs.readFileSync(path.join(__dirname, 'src/components/SmartAppealAssistant.tsx'), 'utf8');
const processor = fs.readFileSync(path.join(__dirname, 'src/utils/fileProcessor.ts'), 'utf8');

assert.doesNotMatch(server, /app\.post\("\/api\/ocr"/);
assert.doesNotMatch(server, /runPaddleOcrPdf|validateImageDataUrl|assessOcrText/);
assert.doesNotMatch(assistant, /fetch\('\/api\/ocr'|toDataURL|validateImagePixels|splitOcrUncertainty/);
assert.doesNotMatch(processor, /imagesToUpload|toDataURL|canvas/);
assert.match(assistant, /沒有可抽取文字/);

console.log('text-only document flow tests passed');
