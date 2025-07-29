import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDASkJUikt8jDqGjcBMc-sUj-CXmc1H99I",
  authDomain: "inscripcionesmjp.firebaseapp.com",
  projectId: "inscripcionesmjp",
  storageBucket: "inscripcionesmjp.firebasestorage.app",
  messagingSenderId: "519079131777",
  appId: "1:519079131777:web:d7c66b4f22b69b7425eb80",
  measurementId: "G-M0X4RX6KXN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
