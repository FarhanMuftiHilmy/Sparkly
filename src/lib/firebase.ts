/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// CRITICAL CONSTRAINT: When the application initially boots, call getFromServer to test connection
export async function testConnection() {
  try {
    const testDocPath = 'test/connection';
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

export async function handleRedirectResult() {
  if (Capacitor.isNativePlatform()) return null;
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log("Authentication redirect result successfully resolved user:", result.user);
      return result.user;
    }
  } catch (error) {
    console.error("Google Authenticator redirect parsing error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    alert(`Google Redirect error:\n${msg}`);
  }
  return null;
}

export async function loginWithGoogle() {
  try {
    if (Capacitor.isNativePlatform()) {
      // Use Capawesome native Firebase Authentication for Google Sign-In
      try {
        console.log("Using native FirebaseAuthentication for Google Sign-In");
        const result = await FirebaseAuthentication.signInWithGoogle({});
        if (result.credential?.idToken) {
          const credential = GoogleAuthProvider.credential(result.credential.idToken);
          const userCredential = await signInWithCredential(auth, credential);
          return userCredential.user;
        } else {
          throw new Error("No ID Token offered by native Google Sign-In helper.");
        }
      } catch (nativeError) {
        console.error("Native Google login failed, trying web fallback:", nativeError);
        const errMsg = nativeError instanceof Error ? nativeError.message : String(nativeError);
        console.warn(`Native Google login failed: ${errMsg}. Trying web sign-in fallback...`);
        // Fallback to popup
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
      }
    } else {
      // Check if it's a mobile device browser where popup is almost certainly blocked
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        console.log("Mobile browser detected - using signInWithRedirect to avoid popup blocker");
        await signInWithRedirect(auth, googleProvider);
        return null; // Will redirect away, page will reload
      } else {
        // Desktop browser - use signInWithPopup
        try {
          const result = await signInWithPopup(auth, googleProvider);
          return result.user;
        } catch (popupError) {
          console.error("Popup login failed, trying redirect as fallback:", popupError);
          // Fallback to redirect if popup failed/blocked
          await signInWithRedirect(auth, googleProvider);
          return null; // Will redirect away, page will reload
        }
      }
    }
  } catch (error) {
    console.error("Google authentication error:", error);
    // Print alert visually so the user can see what the error is on their phone screen!
    const msg = error instanceof Error ? error.message : String(error);
    alert(`Google Authentication error: ${msg}\n\nTroubleshooting tips:\n1. If testing on mobile browser: verify Google Sign-In is enabled in Firebase Authentication.\n2. If testing in Native App: ensure you run 'npx cap sync' and configure SHA-1 in your Firebase project!`);
    throw error;
  }
}

export async function logoutUser() {
  try {
    if (Capacitor.isNativePlatform()) {
      await FirebaseAuthentication.signOut();
    }
    await signOut(auth);
  } catch (error) {
    console.error("Signout error:", error);
    throw error;
  }
}
