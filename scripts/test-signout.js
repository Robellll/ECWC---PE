const BASE = process.env.TEST_URL || 'http://localhost:3000';

async function main() {
  const jar = new Map();
  const store = (res) => {
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';');
      const [name, ...rest] = pair.split('=');
      jar.set(name.trim(), rest.join('=').trim());
    }
  };
  const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  store(csrfRes);

  await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookieHeader() },
    body: new URLSearchParams({
      csrfToken,
      email: 'superadmin@ecwc.gov.et',
      password: 'Demo@2026!',
      callbackUrl: `${BASE}/dashboard`,
      json: 'true',
    }),
    redirect: 'manual',
  }).then(store);

  const sessionBefore = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookieHeader() } });
  const before = await sessionBefore.json();
  console.log('Before signout:', before?.user?.email || '(none)');

  const csrf2 = await fetch(`${BASE}/api/auth/csrf`, { headers: { Cookie: cookieHeader() } });
  const { csrfToken: csrf2Token } = await csrf2.json();
  store(csrf2);

  const signOutRes = await fetch(`${BASE}/api/auth/signout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookieHeader() },
    body: new URLSearchParams({ csrfToken: csrf2Token, callbackUrl: `${BASE}/login`, json: 'true' }),
    redirect: 'manual',
  });
  store(signOutRes);
  console.log('Signout status:', signOutRes.status);

  const sessionAfter = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookieHeader() } });
  const after = await sessionAfter.json();
  console.log('After signout:', after?.user?.email || '(none)');

  if (before?.user && !after?.user) {
    console.log('PASS');
  } else {
    console.log('FAIL');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
