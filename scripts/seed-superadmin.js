import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize admin SDK using local Firebase credentials
try {
  initializeApp({
    projectId: 'uioyoga'
  });
} catch (e) {
  // Already initialized
}

const auth = getAuth();
const db = getFirestore();

async function run() {
  console.log("SEEDED_SUPERADMIN: Searching for user suqisam@gmail.com in Auth...");
  try {
    const userRecord = await auth.getUserByEmail('suqisam@gmail.com');
    console.log("SEEDED_SUPERADMIN: Found user in Auth with UID:", userRecord.uid);

    const userRef = db.collection('users').doc(userRecord.uid);
    await userRef.set({
      uid: userRecord.uid,
      name: userRecord.displayName || 'Alexis Guerra',
      email: 'suqisam@gmail.com',
      role: 'superadmin',
      subscriptionActive: true,
      unlimitedClasses: true,
      classesRemaining: 0,
      createdAt: new Date().toISOString()
    }, { merge: true });

    console.log("SEEDED_SUPERADMIN: Successfully created/updated superadmin document in Firestore!");
    process.exit(0);
  } catch (err) {
    console.error("SEEDED_SUPERADMIN: Error seeding superadmin:", err);
    process.exit(1);
  }
}

run();
