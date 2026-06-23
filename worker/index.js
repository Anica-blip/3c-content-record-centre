// worker/index.js — 3C Content Record Centre Worker
// 3C Thread To Success™
//
// Handles three jobs on one Worker, bound to the shared R2 bucket:
//   1. GitHub OAuth login (single-user gate — only ALLOWED_GITHUB_LOGIN
//      can ever get a valid session)
//   2. Signed session cookies (no Supabase, no database — just HMAC)
//   3. CRUD for content records, stored as JSON files under
//      env.RECORDS_PREFIX in R2

const SESSION_COOKIE = '3c_session';
const STATE_COOKIE    = '3c_oauth_state';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return corsResponse(env, new Response(null, { status: 204 }));
    }

    try {
      if (path === '/auth/login')    return handleLogin(env);
      if (path === '/auth/callback') return handleCallback(request, url, env);
      if (path === '/auth/logout')   return corsResponse(env, handleLogout());
      if (path === '/auth/me')       return corsResponse(env, await handleMe(request, env));

      if (path === '/api/records' && request.method === 'GET')
        return corsResponse(env, await guarded(request, env, () => listRecords(url, env)));

      if (path === '/api/records' && request.method === 'POST')
        return corsResponse(env, await guarded(request, env, () => createRecord(request, env)));

      const recordMatch = path.match(/^\/api\/records\/(.+)$/);
      if (recordMatch) {
        const id = decodeURIComponent(recordMatch[1]);
        if (request.method === 'GET')    return corsResponse(env, await guarded(request, env, () => getRecord(id, env)));
        if (request.method === 'PUT')    return corsResponse(env, await guarded(request, env, () => putRecord(id, request, env)));
        if (request.method === 'DELETE') return corsResponse(env, await guarded(request, env, () => deleteRecordObj(id, env)));
      }

      return corsResponse(env, jsonResponse({ error: 'Not found' }, 404));
    } catch (err) {
      return corsResponse(env, jsonResponse({ error: err.message || 'Server error' }, 500));
    }
  },
};

// ── OAuth: login ────────────────────────────────────────────
async function handleLogin(env) {
  const state = randomToken();
  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', callbackUrl(env));
  authorizeUrl.searchParams.set('scope', 'read:user');
  authorizeUrl.searchParams.set('state', state);

  const res = Response.redirect(authorizeUrl.toString(), 302);
  return withCookie(res, STATE_COOKIE, state, { maxAge: 600 });
}

function callbackUrl(env) {
  // Always derived from this Worker's own custom domain, not GitHub Pages.
  return `https://recordmanagement.threadcommand.center/auth/callback`;
}

// ── OAuth: callback ─────────────────────────────────────────
async function handleCallback(request, url, env) {
  const code  = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookies = parseCookies(request);

  if (!code || !state || state !== cookies[STATE_COOKIE]) {
    return new Response('OAuth state mismatch — please try logging in again.', { status: 400 });
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: callbackUrl(env),
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return new Response('GitHub did not return an access token.', { status: 400 });
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': '3c-content-record-centre',
    },
  });
  const user = await userRes.json();

  if (user.login !== env.ALLOWED_GITHUB_LOGIN) {
    return new Response('This account is not authorised for the Content Record Centre.', { status: 403 });
  }

  const session = await signSession({ login: user.login }, env.SESSION_SECRET);
  const res = Response.redirect(env.FRONTEND_URL, 302);
  let out = withCookie(res, SESSION_COOKIE, session, { maxAge: SESSION_MAX_AGE });
  out = withCookie(out, STATE_COOKIE, '', { maxAge: 0 });
  return out;
}

// ── OAuth: logout ───────────────────────────────────────────
function handleLogout() {
  const res = new Response(null, { status: 204 });
  return withCookie(res, SESSION_COOKIE, '', { maxAge: 0 });
}

// ── OAuth: me ───────────────────────────────────────────────
async function handleMe(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return jsonResponse({ error: 'Not authenticated' }, 401);
  return jsonResponse({ user });
}

async function guarded(request, env, handler) {
  const user = await getSessionUser(request, env);
  if (!user) return jsonResponse({ error: 'Not authenticated' }, 401);
  return handler();
}

async function getSessionUser(request, env) {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const payload = await verifySession(token, env.SESSION_SECRET);
  if (!payload) return null;
  if (payload.login !== env.ALLOWED_GITHUB_LOGIN) return null;
  return { login: payload.login };
}

// ── Records: list ───────────────────────────────────────────
async function listRecords(url, env) {
  const listing = await env.RECORDS_BUCKET.list({ prefix: env.RECORDS_PREFIX });
  const records = [];
  for (const obj of listing.objects) {
    const file = await env.RECORDS_BUCKET.get(obj.key);
    if (!file) continue;
    records.push(await file.json());
  }

  const platform = url.searchParams.get('platform');
  const format   = url.searchParams.get('format');
  const persona  = url.searchParams.get('persona');
  const q        = url.searchParams.get('q')?.toLowerCase();

  let results = records;
  if (platform) results = results.filter(r => r.platforms?.includes(platform));
  if (format)   results = results.filter(r => r.format === format);
  if (persona)  results = results.filter(r => r.persona === persona);
  if (q) {
    results = results.filter(r =>
      [r.category, r.persona, r.title, r.index, r.id, ...(r.platforms || [])]
        .join(' ').toLowerCase().includes(q)
    );
  }

  return jsonResponse(results);
}

// ── Records: get one ────────────────────────────────────────
async function getRecord(id, env) {
  const file = await env.RECORDS_BUCKET.get(`${env.RECORDS_PREFIX}${id}.json`);
  if (!file) return jsonResponse({ error: 'Record not found' }, 404);
  return jsonResponse(await file.json());
}

// ── Records: create (rejects if ID already exists) ─────────
async function createRecord(request, env) {
  const record = await request.json();
  if (!record.id) return jsonResponse({ error: 'Missing record id' }, 400);

  const key = `${env.RECORDS_PREFIX}${record.id}.json`;
  const existing = await env.RECORDS_BUCKET.head(key);
  if (existing) return jsonResponse({ error: 'A record with this ID already exists' }, 409);

  await env.RECORDS_BUCKET.put(key, JSON.stringify(record), {
    httpMetadata: { contentType: 'application/json' },
  });
  return jsonResponse(record, 201);
}

// ── Records: update (upsert — re-saves, never duplicates) ──
async function putRecord(id, request, env) {
  const record = await request.json();
  record.id = id;
  const key = `${env.RECORDS_PREFIX}${id}.json`;
  await env.RECORDS_BUCKET.put(key, JSON.stringify(record), {
    httpMetadata: { contentType: 'application/json' },
  });
  return jsonResponse(record);
}

// ── Records: delete ─────────────────────────────────────────
async function deleteRecordObj(id, env) {
  await env.RECORDS_BUCKET.delete(`${env.RECORDS_PREFIX}${id}.json`);
  return new Response(null, { status: 204 });
}

// ── Session signing (HMAC-SHA256, no external deps) ─────────
async function signSession(payload, secret) {
  const body = base64url(JSON.stringify({ ...payload, exp: Date.now() + SESSION_MAX_AGE * 1000 }));
  const sig  = await hmac(body, secret);
  return `${body}.${sig}`;
}

async function verifySession(token, secret) {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = await hmac(body, secret);
  if (expected !== sig) return null;
  const payload = JSON.parse(base64urlDecode(body));
  if (payload.exp < Date.now()) return null;
  return payload;
}

async function hmac(data, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return base64url(String.fromCharCode(...new Uint8Array(sigBuf)));
}

function base64url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str) {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

function randomToken() {
  return base64url(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
}

// ── Cookies ──────────────────────────────────────────────────
function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  return header.split(';').reduce((acc, part) => {
    const [k, ...v] = part.trim().split('=');
    if (k) acc[k] = decodeURIComponent(v.join('='));
    return acc;
  }, {});
}

function withCookie(response, name, value, { maxAge }) {
  const res = new Response(response.body, response);
  res.headers.append(
    'Set-Cookie',
    `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}`
  );
  return res;
}

// ── CORS + JSON helpers ──────────────────────────────────────
function corsResponse(env, response) {
  const res = new Response(response.body, response);
  res.headers.set('Access-Control-Allow-Origin', env.ALLOWED_ORIGIN);
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
