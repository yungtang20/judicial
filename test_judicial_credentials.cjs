const assert = require('node:assert/strict');
const fs = require('node:fs');

async function run() {
  const { resolveJudicialCredentials, judicialUpstreamError, normalizeJudicialResponse } = await import('./src/lib/judicialCredentials.ts');
  const credentials = resolveJudicialCredentials({
    JUDICIAL_OPENDATA_ACCOUNT: 'env-account',
    JUDICIAL_OPENDATA_PASSWORD: 'env-password'
  }, {
    account: 'attacker-account',
    password: 'attacker-password',
    user: 'attacker-user'
  });
  assert.deepEqual(credentials, { memberAccount: 'env-account', pwd: 'env-password' });
  assert.deepEqual(resolveJudicialCredentials({}), { memberAccount: '', pwd: '' });
  assert.deepEqual(judicialUpstreamError(401), { code: 'JUDICIAL_AUTH_FAILED', message: '司法院帳密驗證失敗或遭拒絕' });
  assert.deepEqual(judicialUpstreamError(503), { code: 'JUDICIAL_API_UNAVAILABLE', message: '司法院外部服務暫時無法使用' });
  assert.deepEqual(normalizeJudicialResponse(401, { succeeded: false }), {
    statusCode: 401,
    body: { succeeded: false, code: 'JUDICIAL_AUTH_FAILED', message: '司法院帳密驗證失敗或遭拒絕' }
  });
  assert.deepEqual(normalizeJudicialResponse(503, { error: 'down' }), {
    statusCode: 503,
    body: { succeeded: false, code: 'JUDICIAL_API_UNAVAILABLE', message: '司法院外部服務暫時無法使用' }
  });
  assert.deepEqual(normalizeJudicialResponse(200, { succeeded: false }), {
    statusCode: 401,
    body: { succeeded: false, code: 'JUDICIAL_AUTH_FAILED', message: '司法院帳密驗證失敗或遭拒絕' }
  });
  const server = fs.readFileSync('server.ts', 'utf8');
  const memberTokenRoute = server.slice(server.indexOf('app.post("/api/judicial/member-token"'), server.indexOf('app.post("/api/judicial/jdg/auth"'));
  const authRoute = server.slice(server.indexOf('app.post("/api/judicial/jdg/auth"'), server.indexOf('app.post("/api/judicial/jdg/jlist"'));
  assert.match(authRoute, /normalizeJudicialResponse\(response\.status, data\)/);
  assert.match(memberTokenRoute, /normalizeJudicialResponse\(response\.status, data\)/);
}

run().then(() => console.log('judicial credential tests passed'));
