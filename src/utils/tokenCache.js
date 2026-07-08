// Small wrapper around localStorage for the Google Sheets access token.
const TOKEN_KEY = 'google_sheet_api_token';
const EXPIRY_KEY = 'google_sheet_token_expiry';
const TOKEN_EVENT = 'google-sheet-token-change';

// Google access tokens usually last ~1h. This is only used for tokens returned
// by Firebase, which does not include expires_in in the signInWithPopup result.
const DEFAULT_TOKEN_LIFETIME_MS = 3500 * 1000;

function emitTokenChange(token) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(TOKEN_EVENT, {
      detail: { token },
    })
  );
}

export function readCachedToken() {
  if (typeof localStorage === 'undefined') return null;

  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);

  if (token && expiry && Date.now() < Number(expiry)) return token;
  if (token || expiry) clearCachedToken();
  return null;
}

// lifetimeMs is optional. Pass GIS expires_in * 1000 when available.
export function writeCachedToken(token, lifetimeMs = DEFAULT_TOKEN_LIFETIME_MS) {
  if (typeof localStorage === 'undefined') return;

  localStorage.setItem(TOKEN_KEY, token);
  // Expire 60s early so Google API calls do not race the real expiry time.
  const expiry = Date.now() + Math.max(0, lifetimeMs - 60_000);
  localStorage.setItem(EXPIRY_KEY, String(expiry));
  emitTokenChange(token);
}

export function clearCachedToken() {
  if (typeof localStorage === 'undefined') return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  emitTokenChange(null);
}

export function isTokenExpired() {
  if (typeof localStorage === 'undefined') return true;

  const expiry = localStorage.getItem(EXPIRY_KEY);
  return !expiry || Date.now() > Number(expiry);
}

export function getTokenExpiry() {
  if (typeof localStorage === 'undefined') return null;

  const expiry = localStorage.getItem(EXPIRY_KEY);
  return expiry ? Number(expiry) : null;
}

export function subscribeTokenChanges(callback) {
  if (typeof window === 'undefined') return () => {};

  const handler = (event) => callback(event.detail?.token ?? readCachedToken());
  window.addEventListener(TOKEN_EVENT, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(TOKEN_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
