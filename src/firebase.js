import { deleteApp, initializeApp } from 'firebase/app';
import { getAuth as _getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore as _getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB4d69YDH8fNur8Lr2zuQJsJ7OGz8KVMGQ",
  authDomain: "inscripciones-app-dddec.firebaseapp.com",
  projectId: "inscripciones-app-dddec",
  storageBucket: "inscripciones-app-dddec.firebasestorage.app",
  messagingSenderId: "450704414523",
  appId: "1:450704414523:web:a3482b062dac1e5b8fc91e",
  measurementId: "G-XS276B0HZ0"
};

let _app = null;
let _auth = null;
let _db = null;
let _googleProvider = null;

function initFirebase() {
  if (_app) return _app;
  _app = initializeApp(firebaseConfig);
  _auth = _getAuth(_app);
  _db = _getFirestore(_app);
  _googleProvider = new GoogleAuthProvider();
  _googleProvider.setCustomParameters({ prompt: 'select_account' });
  return _app;
}

export function getAuth() {
  initFirebase();
  return _auth;
}

export function getDb() {
  initFirebase();
  return _db;
}

export function getGoogleProvider() {
  initFirebase();
  return _googleProvider;
}

export const createSecondaryAuth = () => {
  const secondaryApp = initializeApp(
    firebaseConfig,
    `secondary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  return {
    secondaryApp,
    secondaryAuth: _getAuth(secondaryApp)
  };
};

export const destroySecondaryApp = (secondaryApp) => deleteApp(secondaryApp);
