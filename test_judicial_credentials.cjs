const assert = require('node:assert/strict');

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
}

run().then(() => console.log('judicial credential tests passed'));
