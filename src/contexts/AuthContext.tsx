import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      setFirebaseUser(currUser);
      
      if (currUser) {
        // Fetch custom user profile from Firestore
        const userDocRef = doc(db, 'users', currUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() } as User);
        } else {
          // If the user doc doesn't exist, they are partially registered (need role)
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const updateRole = async (role: UserRole) => {
    if (!firebaseUser) throw new Error("No authenticated user");
    
    const userData: User = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'Anonymous User',
      email: firebaseUser.email || '',
      role: role,
      avatarUrl: firebaseUser.photoURL || undefined,
      joinedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), userData);
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, signOut, updateRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
