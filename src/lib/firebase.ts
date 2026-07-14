import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configs for all tenants
const tenantConfigs: Record<string, any> = {
  "uioyoga": {
    apiKey: "AIzaSyA3Y1ihrZ2TvAomDKcW7unMdz4StBigTI4",
    authDomain: "uioyoga.firebaseapp.com",
    projectId: "uioyoga",
    storageBucket: "uioyoga.firebasestorage.app",
    messagingSenderId: "371534214675",
    appId: "1:371534214675:web:081808ac67284ae33171e6"
  },
  "kukutyoga": {
    apiKey: "AIzaSyD2pnzmtlcZRo9-sLsOS-s11kndd_Hp85M",
    authDomain: "kukutyoga-96c6b.firebaseapp.com",
    projectId: "kukutyoga-96c6b",
    storageBucket: "kukutyoga-96c6b.firebasestorage.app",
    messagingSenderId: "185996047683",
    appId: "1:185996047683:web:7ced31b24f754ca0606bf6"
  }
};

const getTenantKey = (): string => {
  const host = window.location.hostname;
  
  // Allow local testing using ?tenant=name query param
  const searchParams = new URLSearchParams(window.location.search);
  const queryTenant = searchParams.get('tenant');
  if (queryTenant) {
    localStorage.setItem('uio_tenant_override', queryTenant);
    return queryTenant.toLowerCase();
  }
  
  const savedTenant = localStorage.getItem('uio_tenant_override');
  if (savedTenant && (host.includes('localhost') || host.includes('127.0.0.1'))) {
    return savedTenant.toLowerCase();
  }

  const parts = host.split('.');
  // Check if we have a subdomain (e.g. kukutyoga.uioyoga.com) and it's not 'www' or 'dev'
  if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'dev') {
    return parts[0].toLowerCase();
  }

  return 'uioyoga'; // Default base configuration
};

const tenantKey = getTenantKey();
const firebaseConfig = tenantConfigs[tenantKey] || tenantConfigs['uioyoga'];

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
