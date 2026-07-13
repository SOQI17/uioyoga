import { create } from 'zustand';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface UserData {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'instructor' | 'student';
  membershipId?: string;
  subscriptionActive?: boolean;
  classesRemaining?: number;
  unlimitedClasses?: boolean;
  subscriptionExpiry?: string;
  subscriptionType?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
}

interface AuthState {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setUserData: (userData: UserData | null) => void;
  initializeAuth: () => void;
  toggleAdminMode: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userData: null,
  loading: true,
  setUser: (user) => set({ user }),
  setUserData: (userData) => set({ userData }),
  initializeAuth: () => {
    onAuthStateChanged(auth, async (user) => {
      set({ user });
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const isAdmin = user.email?.toLowerCase().includes('alexis') || 
                          user.email?.toLowerCase() === 'suqisam@gmail.com' ||
                          false;
          
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            if (isAdmin && data.role !== 'admin') {
              data.role = 'admin';
              try {
                await setDoc(doc(db, 'users', user.uid), { role: 'admin' }, { merge: true });
              } catch (writeErr) {
                console.warn("Could not upgrade user role to admin in Firestore:", writeErr);
              }
            }
            set({ userData: data });
          } else {
            // User exists in Firebase Auth but has no document in Firestore (e.g., Google login first time)
            const fallbackUserData: UserData = {
              uid: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'Usuario',
              email: user.email || '',
              role: isAdmin ? 'admin' : 'student',
            };
            set({ userData: fallbackUserData });

            // Attempt to write the document in Firestore
            try {
              await setDoc(doc(db, 'users', user.uid), {
                ...fallbackUserData,
                createdAt: new Date().toISOString(),
              });
            } catch (writeErr) {
              console.warn("Could not auto-create user document in Firestore:", writeErr);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Fallback to auth provider credentials so the dashboard doesn't render blank
          const fallbackUserData: UserData = {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Usuario',
            email: user.email || '',
            role: 'student',
          };
          set({ userData: fallbackUserData });
        }
      } else {
        set({ userData: null });
      }
      set({ loading: false });
    });
  },
  toggleAdminMode: () => {
    const { userData } = useAuthStore.getState();
    if (userData) {
      const newRole = userData.role === 'admin' ? 'student' : 'admin';
      set({ userData: { ...userData, role: newRole } });
    }
  },
}));
