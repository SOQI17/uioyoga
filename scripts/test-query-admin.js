import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

try {
  initializeApp({
    projectId: 'uioyoga'
  });
} catch (e) {
  // Already initialized
}

const db = getFirestore();

async function run() {
  const snap = await db.collection('studios').get();
  console.log("ADMIN_RESULT: Total studios in Firestore: " + snap.size);
  snap.forEach(doc => {
    console.log("ADMIN_RESULT: Studio: " + doc.id, doc.data());
  });
  process.exit(0);
}

run().catch(err => {
  console.error("ADMIN_RESULT: Error:", err);
  process.exit(1);
});
