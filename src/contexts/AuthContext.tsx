import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  TwitterAuthProvider,
  OAuthProvider,
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInAnonymously as firebaseSignInAnonymously
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  login: (providerName?: 'google' | 'facebook' | 'twitter' | 'linkedin') => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginAnonymously: () => Promise<void>;
  updateUserProfile: (data: { displayName?: string, photoURL?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Initialize user document if it doesn't exist
        try {
          const userDocRef = doc(db, 'users', u.uid);
          const snap = await getDoc(userDocRef);
          if (!snap.exists()) {
            const initialProfile = {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName || 'Voter',
              photoURL: u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`,
              isAdmin: false,
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
              banned: false
            };
            await setDoc(userDocRef, initialProfile, { merge: true });
          } else {
            // Just update lastLogin on new auth session (optional)
            await updateDoc(userDocRef, { lastLogin: serverTimestamp() }).catch(() => {});
          }
        } catch (err) {
          console.error("Auth init error:", err);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Real-time profile sync
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribeProfile = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        setProfile(snap.data());
      }
      setLoading(false);
    }, (error) => {
      console.warn("Profile listener error:", error);
      // If we get permission denied here, it's likely they aren't logged in correctly or rules are propagation delay
      setLoading(false);
    });

    return () => unsubscribeProfile();
  }, [user]);

  const login = async (providerName: 'google' | 'facebook' | 'twitter' | 'linkedin' = 'google') => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      let provider: any;
      switch (providerName) {
        case 'facebook':
          provider = new FacebookAuthProvider();
          break;
        case 'twitter':
          provider = new TwitterAuthProvider();
          break;
        case 'linkedin':
          provider = new OAuthProvider('linkedin.com');
          break;
        default:
          provider = new GoogleAuthProvider();
      }
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        console.warn(`${providerName} login popup closed or cancelled`);
      } else {
        console.error(`${providerName} login error:`, error);
        throw error;
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const loginAnonymously = async () => {
    await firebaseSignInAnonymously(auth);
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(res.user, { displayName: name });
      
      const newProfile = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: name,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.user.uid}`,
        isAdmin: false,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        banned: false
      };
      
      await setDoc(doc(db, 'users', res.user.uid), newProfile);
      setProfile(newProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (data: { displayName?: string, photoURL?: string }) => {
    if (!auth.currentUser) return;
    try {
      await updateProfile(auth.currentUser, data);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), data);
      setProfile(prev => ({ ...prev, ...data }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading: loading || isLoggingIn, 
      isAdmin: !!profile?.isAdmin,
      login, 
      loginWithEmail,
      signupWithEmail,
      resetPassword,
      loginAnonymously,
      updateUserProfile,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
