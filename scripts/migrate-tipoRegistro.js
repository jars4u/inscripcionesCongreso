#!/usr/bin/env node
/**
 * Script de migración: añade `tipoRegistro` a documentos de la colección `participantes`
 * Reglas de asignación:
 * - Si `tipoRegistro` ya existe, se salta el documento.
 * - Si `edad` está presente y < 18 => "Participante menor de edad", else "Participante".
 * - Si `edad` no está, pero `fechaNacimiento` existe, calcula la edad desde la fecha.
 *
 * Requisitos:
 * - Proveer credenciales de administrador de Firebase.
 *   Opción A: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccount.json"
 *   Opción B: export FIREBASE_SERVICE_ACCOUNT='{"type":...}' (contenido JSON)
 *   Opción C: crear ./serviceAccountKey.json con el JSON de credenciales
 *
 * Ejecución:
 *   npm run migrate:tipoRegistro
 */

const admin = require('firebase-admin');
const fs = require('fs');

function initAdmin() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('Inicializando firebase-admin usando GOOGLE_APPLICATION_CREDENTIALS (applicationDefault)');
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    return;
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({ credential: admin.credential.cert(sa) });
      console.log('Inicializando firebase-admin usando FIREBASE_SERVICE_ACCOUNT env var');
      return;
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT no es JSON válido');
      process.exit(1);
    }
  }
  const localPath = './serviceAccountKey.json';
  if (fs.existsSync(localPath)) {
    const sa = require(localPath);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
    console.log('Inicializando firebase-admin usando ./serviceAccountKey.json');
    return;
  }
  console.error('No se encontraron credenciales de administrador. Define GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT, o coloca serviceAccountKey.json en la raíz del proyecto.');
  process.exit(1);
}

initAdmin();

const db = admin.firestore();

function calcularEdad(fecha) {
  if (!fecha) return null;
  try {
    const hoy = new Date();
    const nacimiento = new Date(fecha);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  } catch (e) {
    return null;
  }
}

(async () => {
  try {
    console.log('Iniciando migración de tipoRegistro en coleccion participantes...');
    const snapshot = await db.collection('participantes').get();
    console.log(`Documentos encontrados: ${snapshot.size}`);
    if (snapshot.empty) {
      console.log('No hay documentos. Saliendo.');
      process.exit(0);
    }

    let updated = 0;
    let skipped = 0;
    const BATCH_LIMIT = 450; // keep below 500
    let batch = db.batch();
    let opsInBatch = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data.tipoRegistro) {
        skipped++;
        continue;
      }
      let edad = null;
      if (data.edad !== undefined && data.edad !== null && data.edad !== "") {
        edad = Number(data.edad);
        if (Number.isNaN(edad)) edad = null;
      }
      if (edad === null) {
        if (data.fechaNacimiento) {
          edad = calcularEdad(data.fechaNacimiento);
        }
      }
      const tipo = (edad !== null && edad < 18) ? 'Participante menor de edad' : 'Participante';
      batch.update(docSnap.ref, { tipoRegistro: tipo });
      opsInBatch++;
      updated++;

      if (opsInBatch >= BATCH_LIMIT) {
        console.log('Enviando batch de', opsInBatch, 'operaciones...');
        await batch.commit();
        batch = db.batch();
        opsInBatch = 0;
      }
    }

    if (opsInBatch > 0) {
      console.log('Enviando último batch de', opsInBatch, 'operaciones...');
      await batch.commit();
    }

    console.log(`Migración completada. Actualizados: ${updated}. Omitidos (ya tenían tipoRegistro): ${skipped}.`);
    process.exit(0);
  } catch (err) {
    console.error('Error durante la migración:', err);
    process.exit(1);
  }
})();
