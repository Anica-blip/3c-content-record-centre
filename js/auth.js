// auth.js — Session guard for the Content Record Centre
// 3C Content Record Centre · 3C Thread To Success™
//
// Uses a bearer token in localStorage, not a cookie. GitHub Pages
// (anica-blip.github.io) and this Worker (recordmanagement.threadcommand.center)
// are different sites — Firefox's Total Cookie Protection and Safari's ITP
// both silently block a cookie set on one from ever being read on the
// other. A token stored in localStorage and sent as an Authorization
// header has no such restriction, since it never relies on the browser
// choosing to forward a cookie cross-site.

import { API_BASE } from './api.js?v=3';

const TOKEN_KEY = '3c_session_token';

/** Reads the stored session token, if any. */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Looks for a token handed back in the URL fragment after the GitHub
 * OAuth round trip (#token=...), stores it, and cleans the URL so it
 * doesn't linger visibly in the address bar.
 */
function captureTokenFromUrl() {
  if (!window.location.hash.startsWith('#token=')) return;
  const token = window.location.hash.slice('#token='.length);
  setToken(token);
  history.replaceState(null, '', window.location.pathname);
}

/**
 * Checks whether the current visitor has a valid session.
 * Returns the user object on success, or null if unauthenticated.
 */
export async function checkSession() {
  captureTokenFromUrl();
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      clearToken();
      return null;
    }
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Guard for pages that require a logged-in session (e.g. index.html).
 * Redirects to login.html if no valid session is found.
 * Call this before rendering anything else.
 */
export async function requireSession() {
  const user = await checkSession();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

/**
 * Guard for the login page itself — if already logged in, skip straight
 * to the app instead of showing the login button again.
 */
export async function redirectIfLoggedIn() {
  const user = await checkSession();
  if (user) {
    window.location.href = 'index.html';
  }
}

/**
 * Sends the visitor to the Worker's login-initiation route, which
 * redirects to GitHub's OAuth screen. No Client ID needed here —
 * the Worker holds that.
 */
export function redirectToLogin() {
  window.location.href = `${API_BASE}/auth/login`;
}

/**
 * Logs out — there's no server-side session to clear with this token
 * model, so this is purely local: remove the token, go back to login.
 */
export function logout() {
  clearToken();
  window.location.href = 'login.html';
}
