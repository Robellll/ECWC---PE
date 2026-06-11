/**
 * Smoke test: login via Auth.js and call a protected API route.
 * Usage: node scripts/test-auth-api.js
 */
const BASE = process.env.TEST_URL || 'http://localhost:3000';

async function main() {
  const jar = new Map();

  function storeCookies(res) {
    const raw = res.headers.getSetCookie?.() || [];
    for (const c of raw) {
      const [pair] = c.split(';');
      const [name, ...rest] = pair.split('=');
      jar.set(name.trim(), rest.join('=').trim());
    }
  }

  function cookieHeader() {
    return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  storeCookies(csrfRes);

  const signInRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader(),
    },
    body: new URLSearchParams({
      csrfToken,
      email: 'superadmin@ecwc.gov.et',
      password: 'Demo@2026!',
      callbackUrl: `${BASE}/dashboard`,
      json: 'true',
    }),
    redirect: 'manual',
  });
  storeCookies(signInRes);
  console.log('Sign-in status:', signInRes.status);

  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: cookieHeader() },
  });
  const session = await sessionRes.json();
  console.log('Session user:', session?.user?.email || '(none)');

  const apiRes = await fetch(`${BASE}/api/equipment`, {
    headers: { Cookie: cookieHeader() },
  });
  const apiData = await apiRes.json();
  console.log('GET /api/equipment:', apiRes.status, Array.isArray(apiData) ? `${apiData.length} items` : apiData);

  if (apiRes.status !== 200) process.exit(1);
  console.log('PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
