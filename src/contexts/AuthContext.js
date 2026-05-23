import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();
export const adminEmails = ['jars4u2@gmail.com', 'carlosurdaneta@gmail.com'];

export const isAdminEmail = (email) => adminEmails.includes(email || '');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let unsubscribeAdmin = null;

    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);

      if (user) {
        // Persistir usuario en 'usuarios' collection
        (async () => {
          try {
            const userRef = doc(db, 'usuarios', user.uid);
            const snap = await getDoc(userRef);

            const payload = {
              email: user.email || null,
              displayName: user.displayName || null,
              photoURL: user.photoURL || null,
              providerData: user.providerData || [],
              lastLogin: serverTimestamp(),
            };

            if (!snap.exists()) {
              payload.createdAt = serverTimestamp();
            }

            await setDoc(userRef, payload, { merge: true });
          } catch (err) {
            console.error('Error persisting user to usuarios collection:', err);
          }
        })();

        // Suscribirse al documento admins/{uid} para actualizar isAdmin en tiempo real
        try {
          const adminRef = doc(db, 'admins', user.uid);
          unsubscribeAdmin = onSnapshot(adminRef, (snap) => {
            const byEmail = isAdminEmail(user.email);
            setIsAdmin(byEmail || snap.exists());
          }, (err) => {
            console.error('Error listening admins doc:', err);
            // fallback a lista blanca por email
            setIsAdmin(isAdminEmail(user.email));
          });
        } catch (err) {
          console.error('Error setting up admin listener:', err);
          setIsAdmin(isAdminEmail(user.email));
        }
      } else {
        // usuario salió
        setIsAdmin(false);
        if (unsubscribeAdmin) {
          try { unsubscribeAdmin(); } catch (e) {}
          unsubscribeAdmin = null;
        }
      }
    });

    return () => {
      unsub();
      if (unsubscribeAdmin) {
        try { unsubscribeAdmin(); } catch (e) {}
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
