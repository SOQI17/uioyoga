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
      root.style.removeProperty('--color-arena-image');
      root.style.removeProperty('--color-border-override');
      root.style.removeProperty('--color-border-override-50');

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
      document.title = 'UIO Yoga Platform';
      let linkIcon: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (linkIcon) linkIcon.href = '/favicon.ico';
      let linkApple: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
      if (linkApple) linkApple.href = '/favicon.ico';

      return;
    }

    try {
      // 1. Fetch studio billing and status info by querying the subdomain field
      const cleanId = id.replace('.uioyoga.com', '');
      const q = query(collection(db, 'studios'), where('subdomain', 'in', [cleanId, `${cleanId}.uioyoga.com`]));
      const querySnap = await getDocs(q);
      
      if (!querySnap.empty) {
        const studioDoc = querySnap.docs[0];
        const info = { id: studioDoc.id, ...studioDoc.data() } as StudioInfo;

        // 2. Fetch studio landing settings using the clean subdomain (tenant ID)
        const settingsSnap = await getDoc(doc(db, 'settings', cleanId));
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

        if (info.useWoodTexture === false) {
          root.style.setProperty('--color-arena-image', 'none');
          root.style.setProperty('--color-border-override', info.secondaryColor || '#e5e7eb');
          root.style.setProperty('--color-border-override-50', 'rgba(0,0,0,0.1)');
        } else {
          root.style.removeProperty('--color-arena-image');
          root.style.removeProperty('--color-border-override');
          root.style.removeProperty('--color-border-override-50');
        }

        // Dynamic tab title and PWA metadata updates
        if (info.name) {
          document.title = info.name;
          
          let metaAppName: HTMLMetaElement | null = document.querySelector("meta[name='application-name']");
          if (metaAppName) metaAppName.content = info.name;

          let metaAppleTitle: HTMLMetaElement | null = document.querySelector("meta[name='apple-mobile-web-app-title']");
          if (metaAppleTitle) metaAppleTitle.content = info.name;
        }

        const iconUrl = settings?.teaserImage || settings?.splashImage || '/logo.jpeg';
        if (iconUrl) {
          let linkIcon: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
          if (!linkIcon) {
            linkIcon = document.createElement('link');
            linkIcon.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(linkIcon);
          }
          linkIcon.href = iconUrl;

          let linkApple: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
          if (!linkApple) {
            linkApple = document.createElement('link');
            linkApple.rel = 'apple-touch-icon';
            document.getElementsByTagName('head')[0].appendChild(linkApple);
          }
          linkApple.href = iconUrl;

          // Dynamically generate PWA manifest for custom shortcut names and icons
          try {
            const manifest = {
              name: info.name || 'UIO Yoga Platform',
              short_name: info.name || 'UIO Yoga',
              start_url: window.location.origin,
              display: 'standalone',
              background_color: info.backgroundColor || '#09090a',
              theme_color: info.primaryColor || '#09090a',
              icons: [
                {
                  src: iconUrl,
                  sizes: '192x192',
                  type: 'image/jpeg',
                  purpose: 'any maskable'
                },
                {
                  src: iconUrl,
                  sizes: '512x512',
                  type: 'image/jpeg'
                }
              ]
            };
            const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
            const manifestUrl = URL.createObjectURL(manifestBlob);
            let linkManifest: HTMLLinkElement | null = document.querySelector("link[rel='manifest']");
            if (!linkManifest) {
              linkManifest = document.createElement('link');
              linkManifest.rel = 'manifest';
              document.getElementsByTagName('head')[0].appendChild(linkManifest);
            }
            linkManifest.href = manifestUrl;
          } catch (e) {
            console.warn("Could not generate dynamic manifest blob:", e);
          }
        }

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
