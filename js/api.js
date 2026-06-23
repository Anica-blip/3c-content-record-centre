// api.js — Worker API layer
// 3C Content Record Centre · 3C Thread To Success™
//
// Single source of truth for the public API base URL. No keys, no
// secrets — everything sensitive lives server-side in the Worker.
//
// API CONTRACT (for the Worker build, once Cloudflare side is ready):
//   GET    /auth/me              -> 200 { user }  | 401
//   GET    /auth/login           -> redirects to GitHub OAuth
//   GET    /auth/callback        -> Worker-only, handles OAuth exchange
//   POST   /auth/logout          -> clears session cookie
//   GET    /api/records          -> list, supports ?platform=&format=&persona=&q=
//   GET    /api/records/:id      -> single record
//   POST   /api/records          -> create (body: record JSON, no id) -> returns record with generated id
//   PUT    /api/records/:id      -> update existing record (re-save, never duplicates)
//   DELETE /api/records/:id      -> delete

export const API_BASE = 'https://recordmanagement.threadcommand.center';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore — use default message
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

/** Fetch all records, optionally filtered/searched server-side. */
export function getRecords(filters = {}) {
  const params = new URLSearchParams(filters);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/records${query}`);
}

/** Fetch a single record by its canonical ID. */
export function getRecord(id) {
  return request(`/api/records/${encodeURIComponent(id)}`);
}

/** Create a new record. Server generates and returns the canonical ID. */
export function createRecord(record) {
  return request('/api/records', {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

/** Update an existing record in place — never creates a duplicate. */
export function updateRecord(id, record) {
  return request(`/api/records/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(record),
  });
}

/** Delete a record permanently. */
export function deleteRecord(id) {
  return request(`/api/records/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
