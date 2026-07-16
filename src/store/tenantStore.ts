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
      const root = document.documentElement;
      root.style.removeProperty('--color-salvia');
      root.style.removeProperty('--color-marfil');
      root.style.removeProperty('--color-arena');
      root.style.removeProperty('--color-terracota');
      root.style.removeProperty('--color-gris');

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

        // Apply custom colors to document element if present, or fallback to defaults
        const root = document.documentElement;
        if (info.primaryColor) root.style.setProperty('--color-salvia', info.primaryColor);
        else root.style.removeProperty('--color-salvia');

        if (info.backgroundColor) root.style.setProperty('--color-marfil', info.backgroundColor);
        else root.style.removeProperty('--color-marfil');

        if (info.secondaryColor) root.style.setProperty('--color-arena', info.secondaryColor);
        else root.style.removeProperty('--color-arena');

        if (info.accentColor) root.style.setProperty('--color-terracota', info.accentColor);
        else root.style.removeProperty('--color-terracota');

        if (info.textColor) root.style.setProperty('--color-gris', info.textColor);
        else root.style.removeProperty('--color-gris');

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
