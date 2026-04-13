// ============================
// AlterAi - Firebase Firestore
// Letakkan file serviceAccount.json di root project
// Download dari Firebase Console > Project Settings > Service Accounts
// ============================

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccount.json'); // buat sendiri, jangan di-commit ke git

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

async function safeGet(queryOrRef) {
  try {
    const snap = await queryOrRef.get();
    return snap;
  } catch (e) {
    if (e.code === 5 || (e.message && e.message.includes('NOT_FOUND'))) {
      return { empty: true, docs: [], size: 0 };
    }
    throw e;
  }
}

async function safeDocGet(ref) {
  try {
    const doc = await ref.get();
    return doc;
  } catch (e) {
    if (e.code === 5 || (e.message && e.message.includes('NOT_FOUND'))) {
      return { exists: false, data: () => null };
    }
    throw e;
  }
}

// ====== USER ======
async function findUser(query) {
  const entries = Object.entries(query);
  if (entries.length === 1 && entries[0][0] === 'id') {
    const doc = await safeDocGet(db.collection('users').doc(entries[0][1]));
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }
  const [field, value] = entries[0];
  const snap = await safeGet(db.collection('users').where(field, '==', value).limit(1));
  if (!snap || snap.empty || !snap.docs?.length) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function createUser(data) {
  const ref = await db.collection('users').add({ ...data, createdAt: new Date().toISOString() });
  return { id: ref.id, ...data };
}

async function updateUser(id, updates) {
  await db.collection('users').doc(id).set(updates, { merge: true });
  return true;
}

// ====== SESSION ======
async function getSessions(uid) {
  const snap = await safeGet(
    db.collection('sessions').where('uid', '==', uid).orderBy('updatedAt', 'desc').limit(50)
  );
  if (!snap || snap.empty) return [];
  return snap.docs.map(d => d.data());
}

async function getSession(sessionId) {
  const doc = await safeDocGet(db.collection('sessions').doc(sessionId));
  if (!doc.exists) return null;
  return doc.data();
}

async function createSession(data) {
  const now = new Date().toISOString();
  const session = { ...data, createdAt: now, updatedAt: now };
  await db.collection('sessions').doc(data.sessionId).set(session);
  return session;
}

async function updateSession(sessionId, updates) {
  await db.collection('sessions').doc(sessionId).set(
    { ...updates, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  return true;
}

async function deleteSession(sessionId) {
  await db.collection('sessions').doc(sessionId).delete();
  return true;
}

module.exports = {
  findUser, createUser, updateUser,
  getSessions, getSession, createSession, updateSession, deleteSession,
};
