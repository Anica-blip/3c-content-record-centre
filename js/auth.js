// auth.js — Session guard for the Content Record Centre
// 3C Content Record Centre · 3C Thread To Success™
//
// This module never touches a GitHub Client ID or Secret. It only talks
// to the Worker's /auth/* endpoints, which handle the entire OAuth
// exchange server-side. That is what makes this file safe to ship before
// the Worker (and the GitHub OAuth App) even exist.

import { API_BASE } from './api.js';

/**
 * Checks whether the current visitor has a valid session.
 * Returns the user object on success, or null if unauthenticated.
 */
export async function checkSession() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    return await res.json();
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
 * Logs out — clears the session cookie on the Worker, then returns
 * to the login page.
 */
export async function logout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // proceed to redirect regardless
  }
  window.location.href = 'login.html';
}
