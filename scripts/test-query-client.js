import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA3Y1ihrZ2TvAomDKcW7unMdz4StBigTI4",
  authDomain: "uioyoga.firebaseapp.com",
  projectId: "uioyoga",
  storageBucket: "uioyoga.firebasestorage.app",
  messagingSenderId: "371534214675",
  appId: "1:371534214675:web:081808ac67284ae33171e6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  try {
    const snap = await getDocs(collection(db, 'studios'));
    console.log("DIAGNOSTIC_RESULT: Total studios in Firestore: " + snap.size);
    snap.forEach(doc => {
      console.log("DIAGNOSTIC_RESULT: Studio ID: " + doc.id + " -> Name: " + doc.data().name);
    });
  } catch (err) {
    console.error("DIAGNOSTIC_RESULT: Error querying Firestore:", err);
  }
  process.exit(0);
}

check();
