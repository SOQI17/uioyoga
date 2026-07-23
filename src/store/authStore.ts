import { create } from 'zustand';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, getTenantId } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

export interface UserData {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'instructor' | 'student';
  tenantId?: string;
  membershipId?: string;
  subscriptionActive?: boolean;
  classesRemaining?: number;
  unlimitedClasses?: boolean;
  subscriptionExpiry?: string;
  subscriptionType?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  createdAt?: string;
  acceptedPrivacyPolicy?: boolean;
  policyAcceptedAt?: string;
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
          const isSuperAdminEmail = user.email?.toLowerCase() === 'suqisam@gmail.com';
          
          // Check if this user is assigned as owner of any studio
          let assignedStudioId: string | null = null;
          try {
            const studiosQuery = query(collection(db, 'studios'), where('ownerEmail', '==', user.email?.toLowerCase()));
            const studiosSnap = await getDocs(studiosQuery);
            if (!studiosSnap.empty) {
              assignedStudioId = studiosSnap.docs[0].id;
            }
          } catch (err) {
            console.warn("Could not query studios for owner assignment:", err);
          }

          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            
            // Auto-upgrade suqisam@gmail.com to superadmin if they don't have it
            if (isSuperAdminEmail && data.role !== 'superadmin') {
              data.role = 'superadmin';
              delete data.tenantId;
              try {
                await setDoc(doc(db, 'users', user.uid), { role: 'superadmin', tenantId: null }, { merge: true });
              } catch (writeErr) {
                console.warn("Could not upgrade user role to superadmin in Firestore:", writeErr);
              }
            }

            // Auto-promote user to admin of their assigned studio
            if (assignedStudioId && data.role !== 'superadmin') {
              let updated = false;
              if (data.role !== 'admin') {
                data.role = 'admin';
                updated = true;
              }
              if (data.tenantId !== assignedStudioId) {
                data.tenantId = assignedStudioId;
                updated = true;
              }
              if (updated) {
                try {
                  await setDoc(doc(db, 'users', user.uid), { role: 'admin', tenantId: assignedStudioId }, { merge: true });
                } catch (writeErr) {
                  console.warn("Could not promote user to studio admin in Firestore:", writeErr);
                }
              }
            }

            console.log(`DIAGNOSTICO TENANT - Email: ${data.email}, Role: ${data.role}, UserTenant: ${data.tenantId}, DetectedTenant: ${getTenantId()}`);

            // Resolve studio subdomain
            let allowedSubdomain = data.tenantId;
            if (data.tenantId) {
              try {
                const studioDoc = await getDoc(doc(db, 'studios', data.tenantId));
                if (studioDoc.exists()) {
                  const sData = studioDoc.data();
                  if (sData.subdomain) {
                    allowedSubdomain = sData.subdomain;
                  }
                }
              } catch (err) {
                console.warn("Could not fetch studio subdomain:", err);
              }
            }

            const cleanUserTenant = allowedSubdomain?.replace('.uioyoga.com', '').replace(/\s+/g, '').toLowerCase();
            const cleanDetectedTenant = getTenantId()?.replace('.uioyoga.com', '').replace(/\s+/g, '').toLowerCase();

            if (data.role !== 'superadmin' && cleanUserTenant && cleanUserTenant !== cleanDetectedTenant) {
              console.warn(`User belongs to a different tenant. UserTenant: ${cleanUserTenant}, DetectedTenant: ${cleanDetectedTenant}. Signing out...`);
              await auth.signOut();
              set({ user: null, userData: null });
              return;
            }
            
            if (data.role !== 'superadmin' && !data.tenantId) {
              data.tenantId = getTenantId();
              try {
                await setDoc(doc(db, 'users', user.uid), { tenantId: getTenantId() }, { merge: true });
              } catch (writeErr) {
                console.warn("Could not save tenantId to user doc:", writeErr);
              }
            }

            set({ userData: data });
          } else {
            // User exists in Firebase Auth but has no document in Firestore (e.g., Google login first time)
            const fallbackUserData: UserData = {
              uid: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'Usuario',
              email: user.email || '',
              role: isSuperAdminEmail ? 'superadmin' : (assignedStudioId ? 'admin' : 'student'),
              subscriptionActive: false,
              classesRemaining: 0,
              unlimitedClasses: false,
              tenantId: isSuperAdminEmail ? undefined : (assignedStudioId ? assignedStudioId : getTenantId()),
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
