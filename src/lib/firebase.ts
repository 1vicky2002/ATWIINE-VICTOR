import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import managedConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: "AIzaSyAvLcOWnsk3VcIfT5z6dpOOblL9LFzQZMc",
  authDomain: "ug-votes.firebaseapp.com",
  projectId: "ug-votes",
  storageBucket: "ug-votes.firebasestorage.app",
  messagingSenderId: "134464548814",
  appId: "1:134464548814:web:717cc6397e690b2e91c59f",
  measurementId: "G-9SYG6E28VV"
};

// Initialize app
const app = initializeApp(firebaseConfig);

// Initialize firestore
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
  localCache: memoryLocalCache(),
});

export const auth = getAuth(app);
export const dbs = [db]; // Array with single database for compatibility with existing loops

/**
 * DEFAULT EXPORTS
 * Most parts of the app use these.
 */

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
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
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
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };

  const safeJsonStringify = (obj: any) => {
    const cache = new Set();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) return '[Circular]';
        cache.add(value);
      }
      return value;
    });
  };

  const message = safeJsonStringify(errInfo);
  console.error('Firestore Error: ', message);
  throw new Error(message);
}
