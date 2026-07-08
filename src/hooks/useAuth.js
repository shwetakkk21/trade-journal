import { useEffect, useRef, useState } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase'; // Verify db instance is exported from firebase configuration
import { readCachedToken, writeCachedToken, clearCachedToken, getTokenExpiry } from '../utils/tokenCache';

const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

let gisLoader = null;
function ensureGisLoaded() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoader) return gisLoader;

  gisLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.body.appendChild(script);
  });
  return gisLoader;
}

function requestGoogleToken(loginHint, prompt = '') {
  return new Promise((resolve, reject) => {
    const clientId = import.meta.env.VITE_GCP_CLIENT_ID;
    if (!clientId) {
      reject(new Error('VITE_GCP_CLIENT_ID is not set'));
      return;
    }
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPES,
      login_hint: loginHint || undefined,
      prompt,
      callback: (resp) => {
        if (resp?.error) { reject(new Error(resp.error_description || resp.error)); return; }
        resolve({ accessToken: resp.access_token, expiresInMs: (Number(resp.expires_in) || 3600) * 1000 });
      }
    });
    tokenClient.requestAccessToken({ prompt });
  });
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null); // 'PENDING' | 'APPROVED' | 'REJECTED'
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(() => readCachedToken());
  const refreshTimer = useRef(null);
  const userRef = useRef(null);

  const clearRefreshTimer = () => { if (refreshTimer.current) { clearTimeout(refreshTimer.current); refreshTimer.current = null; } };

  const scheduleRefresh = (fbUser = userRef.current) => {
    clearRefreshTimer();
    const expiry = getTokenExpiry();
    if (!expiry || !fbUser) return;
    const delay = Math.max(1000, expiry - Date.now() - 60_000);
    refreshTimer.current = setTimeout(() => {
      refreshAccessToken(fbUser).catch(err => console.warn('Silent Google token refresh failed:', err));
    }, delay);
  };

  const refreshAccessToken = async (fbUser = userRef.current, options = {}) => {
    await ensureGisLoaded();
    const loginHint = fbUser?.email || userRef.current?.email;
    const { accessToken: fresh, expiresInMs } = await requestGoogleToken(loginHint, options.prompt ?? '');
    writeCachedToken(fresh, expiresInMs);
    setAccessToken(fresh);
    scheduleRefresh(fbUser);
    return fresh;
  };

  // Sync initialization routine inside database registry
  const registerAndSyncUserStatus = async (fbUser) => {
    const docRef = doc(db, 'users', fbUser.uid);
    const docSnap = await getDoc(docRef);
    const currentIsoString = new Date().toISOString();

    if (!docSnap.exists()) {
      const initialProfile = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
        status: 'PENDING',
        isAdmin: false,
        createdAt: currentIsoString,
        lastLogin: currentIsoString
      };
      await setDoc(docRef, initialProfile);
      setApprovalStatus('PENDING');
    } else {
      const userData = docSnap.data();
      setApprovalStatus(userData.status || 'PENDING');
      setIsAdmin(userData.isAdmin || false);
      await updateDoc(docRef, { lastLogin: currentIsoString });
    }

    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const liveData = snap.data();
        setApprovalStatus(liveData.status || 'PENDING');
        setIsAdmin(liveData.isAdmin || false);
      }
    });
  };

  useEffect(() => {
    let unsubsDoc = null;

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubsDoc) unsubsDoc();
      userRef.current = fbUser;
      setUser(fbUser);

      if (!fbUser) {
        clearCachedToken();
        setAccessToken(null);
        setApprovalStatus(null);
        clearRefreshTimer();
        setAuthLoading(false);
        return;
      }

      try {
        unsubsDoc = await registerAndSyncUserStatus(fbUser);
      } catch (err) {
        console.error("Firestore security gate synchronization failure:", err);
      }

      const cached = readCachedToken();
      if (cached) {
        setAccessToken(cached);
        scheduleRefresh(fbUser);
        setAuthLoading(false);
        return;
      }

      try {
        await refreshAccessToken(fbUser, { prompt: '' });
      } catch (err) {
        console.warn('Could not silently obtain Google access token:', err);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => {
      unsub();
      if (unsubsDoc) unsubsDoc();
      clearRefreshTimer();
    };
  }, []);

  const login = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken ?? null;

    userRef.current = result.user;
    setUser(result.user);

    if (token) {
      writeCachedToken(token);
      setAccessToken(token);
      scheduleRefresh(result.user);
    }

    return { user: result.user, accessToken: token };
  };

  const logout = async () => {
    clearCachedToken();
    setAccessToken(null);
    setApprovalStatus(null);
    clearRefreshTimer();
    await signOut(auth);
  };

  return { user, approvalStatus, isAdmin, authLoading, accessToken, login, logout, refreshAccessToken };
}