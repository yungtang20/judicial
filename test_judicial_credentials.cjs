const assert = require('node:assert/strict');

async function run() {
  const { resolveJudicialCredentials } = await import('./src/lib/judicialCredentials.ts');
  const credentials = resolveJudicialCredentials({
    JUDICIAL_OPENDATA_ACCOUNT: 'env-account',
    JUDICIAL_OPENDATA_PASSWORD: 'env-password'
  }, {
    account: 'attacker-account',
    password: 'attacker-password',
    user: 'attacker-user'
  });
  assert.deepEqual(credentials, { memberAccount: 'env-account', pwd: 'env-password' });
}

run().then(() => console.log('judicial credential tests passed'));
