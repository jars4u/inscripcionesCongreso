import { deleteApp, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB4d69YDH8fNur8Lr2zuQJsJ7OGz8KVMGQ",
  authDomain: "inscripciones-app-dddec.firebaseapp.com",
  projectId: "inscripciones-app-dddec",
  storageBucket: "inscripciones-app-dddec.firebasestorage.app",
  messagingSenderId: "450704414523",
  appId: "1:450704414523:web:a3482b062dac1e5b8fc91e",
  measurementId: "G-XS276B0HZ0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const createSecondaryAuth = () => {
  const secondaryApp = initializeApp(
    firebaseConfig,
    `secondary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  return {
    secondaryApp,
    secondaryAuth: getAuth(secondaryApp)
  };
};

export const destroySecondaryApp = (secondaryApp) => deleteApp(secondaryApp);

googleProvider.setCustomParameters({
  prompt: 'select_account'
});
