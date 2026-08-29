const assert = require('node:assert/strict');
const fs = require('node:fs');

async function run() {
  const { resolveJudicialCredentials, judicialUpstreamError } = await import('./src/lib/judicialCredentials.ts');
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
  const server = fs.readFileSync('server.ts', 'utf8');
  const memberTokenRoute = server.slice(server.indexOf('app.post("/api/judicial/member-token"'), server.indexOf('app.post("/api/judicial/jdg/auth"'));
  const authRoute = server.slice(server.indexOf('app.post("/api/judicial/jdg/auth"'), server.indexOf('app.post("/api/judicial/jdg/jlist"'));
  assert.match(memberTokenRoute, /judicialUpstreamError\(response\.status\)/);
  assert.match(authRoute, /judicialUpstreamError\(response\.status\)/);
}

run().then(() => console.log('judicial credential tests passed'));
