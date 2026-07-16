/**
 * Script de Migración de Base de Datos para SaaS Multi-Tenant (Approach B)
 * Este script se conecta a Firestore y actualiza los documentos existentes para 
 * asignarles el studioId "kukutyoga" (tu primer cliente) y configurar al superadmin.
 * 
 * Instrucciones de ejecución:
 * 1. Asegúrate de tener las credenciales de Firebase configuradas localmente.
 * 2. Ejecuta: node scripts/migrate-to-saas.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Intentar cargar la cuenta de servicio local o usar variables de entorno de Firebase
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');

if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  initializeApp({
    credential: cert(serviceAccount)
  });
} else {
  // Inicialización por defecto usando credenciales del entorno de CLI
  initializeApp({
    projectId: 'uioyoga'
  });
}

const db = getFirestore();

async function runMigration() {
  console.log('Iniciando migración a base de datos multi-tenant...');

  // 1. Crear el Estudio base "Kukut Yoga" en la colección studios
  console.log('Configurando estudio base "kukutyoga"...');
  await db.collection('studios').doc('kukutyoga').set({
    name: 'Kukut Yoga',
    subdomain: 'kukutyoga',
    status: 'active',
    subscriptionPlan: 'premium',
    subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 año de vigencia
    ownerId: '', // Completar con el UID del administrador correspondiente
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  console.log('✓ Estudio "kukutyoga" creado.');

  // 2. Inicializar los ajustes de diseño (settings) de Kukut Yoga
  console.log('Migrando ajustes estéticos de landing page...');
  const oldSettingsSnap = await db.collection('settings').doc('home').get();
  if (oldSettingsSnap.exists()) {
    await db.collection('settings').doc('kukutyoga').set({
      ...oldSettingsSnap.data(),
      updatedAt: new Date().toISOString()
    });
    console.log('✓ Ajustes de landing migrados a settings/kukutyoga.');
  }

  // 3. Migrar documentos de usuarios, clases, reservas, pagos y retiros
  const targetCollections = ['users', 'classes', 'bookings', 'payments', 'retreats'];

  for (const colName of targetCollections) {
    console.log(`Migrando colección: "${colName}"...`);
    const snap = await db.collection(colName).get();
    
    if (snap.empty) {
      console.log(`Colección "${colName}" vacía. Omitiendo.`);
      continue;
    }

    const batch = db.batch();
    let count = 0;

    snap.docs.forEach(doc => {
      const data = doc.data();
      
      if (colName === 'users') {
        // Si el usuario es el dueño principal (suqisam@gmail.com), asignarlo como superadmin
        if (data.email?.toLowerCase() === 'suqisam@gmail.com') {
          batch.update(doc.ref, {
            role: 'superadmin',
            studioId: FieldValue.delete() // Los superadmins no pertenecen a un estudio
          });
          console.log(`✓ Usuario ${data.email} promovido a superadmin.`);
        } else {
          batch.update(doc.ref, {
            studioId: 'kukutyoga'
          });
        }
      } else {
        // Para clases, reservas, pagos y retiros, inyectar el studioId por defecto
        batch.update(doc.ref, {
          studioId: 'kukutyoga'
        });
      }
      count++;
    });

    await batch.commit();
    console.log(`✓ Se migraron ${count} documentos en "${colName}".`);
  }

  console.log('¡Migración a SaaS completada con éxito!');
}

runMigration().catch(err => {
  console.error('Error durante la migración:', err);
});
