import { create } from 'zustand';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, getTenantId } from '../lib/firebase';

export interface StudioInfo {
  id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'trial';
  subscriptionPlan: string;
  subscriptionExpiry?: string;
  trialEndsAt?: string;
  ownerId?: string;
}

export interface StudioSettings {
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: string;
  philosophyTitle?: string;
  philosophyText?: string;
  philosophyImage?: string;
  teaserImage?: string;
  splashTitle?: string;
  splashSubtitle?: string;
  splashImage?: string;
}

interface TenantState {
  tenantId: string;
  tenantInfo: StudioInfo | null;
  tenantSettings: StudioSettings | null;
  loadingTenant: boolean;
  tenantExists: boolean;
  fetchTenantData: () => Promise<void>;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenantId: getTenantId(),
  tenantInfo: null,
  tenantSettings: null,
  loadingTenant: true,
  tenantExists: false,
  fetchTenantData: async () => {
    const id = getTenantId();
    set({ tenantId: id, loadingTenant: true });

    // Superadmin bypass: if tenant is 'uioyoga' (root platform), it is the base platform
    if (id === 'uioyoga') {
      set({
        tenantInfo: {
          id: 'uioyoga',
          name: 'UIO Yoga Platform',
          subdomain: 'uioyoga',
          status: 'active',
          subscriptionPlan: 'enterprise'
        },
        tenantSettings: {
          splashTitle: 'UIO YOGA',
          heroTitle: 'Respira, conecta y transforma',
          heroSubtitle: 'Bienvenidos a la plataforma SaaS de UIO Yoga.'
        },
        tenantExists: true,
        loadingTenant: false
      });
      return;
    }

    try {
      // 1. Fetch studio billing and status info by querying the subdomain field
      const q = query(collection(db, 'studios'), where('subdomain', '==', id));
      const querySnap = await getDocs(q);
      
      if (!querySnap.empty) {
        const studioDoc = querySnap.docs[0];
        const info = { id: studioDoc.id, ...studioDoc.data() } as StudioInfo;

        // 2. Fetch studio landing settings using the actual studio document ID
        const settingsSnap = await getDoc(doc(db, 'settings', studioDoc.id));
        const settings = settingsSnap.exists() ? (settingsSnap.data() as StudioSettings) : null;

        set({
          tenantInfo: info,
          tenantSettings: settings,
          tenantExists: true,
        });
      } else {
        set({
          tenantInfo: null,
          tenantSettings: null,
          tenantExists: false,
        });
      }
    } catch (err) {
      console.error("Error loading tenant information:", err);
      set({ tenantExists: false });
    } finally {
      set({ loadingTenant: false });
    }
  }
}));
