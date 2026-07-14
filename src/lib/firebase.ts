import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA3Y1ihrZ2TvAomDKcW7unMdz4StBigTI4",
  authDomain: "uioyoga.firebaseapp.com",
  projectId: "uioyoga",
  storageBucket: "uioyoga.firebasestorage.app",
  messagingSenderId: "371534214675",
  appId: "1:371534214675:web:081808ac67284ae33171e6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
