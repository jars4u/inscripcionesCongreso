import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query as firestoreQuery,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  getCountFromServer,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const ParticipantsContext = createContext(null);

export function ParticipantsProvider({ children }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 50;
  const [totalCount, setTotalCount] = useState(null);

  const { user } = useAuth();

  useEffect(() => {
    // only subscribe when we have an authenticated user
    if (!user) {
      setParticipants([]);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    const col = collection(getDb(), 'participantes');
    const q = firestoreQuery(col, orderBy('timestamp', 'desc'), firestoreLimit(PAGE_SIZE));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setParticipants(rows);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
        setError('');
        setLoading(false);
        // fetch total count once on initial load
        (async () => {
          try {
            const countQuery = firestoreQuery(collection(getDb(), 'participantes'));
            const snapshotCount = await getCountFromServer(countQuery);
            setTotalCount(snapshotCount.data().count || 0);
          } catch (e) {
            console.warn('could not fetch total count', e);
            setTotalCount(null);
          }
        })();
      },
      (err) => {
        console.error('Error subscribing participantes:', err);
        setParticipants([]);
        setLastVisible(null);
        setHasMore(false);
        setError(
          err && err.code === 'permission-denied'
            ? 'No hay permisos para leer participantes.'
            : 'Error al sincronizar participantes.'
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addParticipant = async (data) => {
    // optimistic add: append local entry until server snapshot arrives
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const localDoc = { id: tempId, ...data };
    setParticipants((cur) => [...cur, localDoc]);
    try {
      const ref = await addDoc(collection(getDb(), 'participantes'), data);
      return { id: ref.id };
    } catch (err) {
      console.error('addParticipant error', err);
      // remove optimistic local entry
      setParticipants((cur) => cur.filter((p) => p.id !== tempId));
      throw err;
    }
  };

  const updateParticipant = async (id, data) => {
    // optimistic update: patch local state and revert on error
    const prev = participants.find((p) => p.id === id);
    setParticipants((cur) => cur.map((p) => (p.id === id ? { ...p, ...data } : p)));
    try {
      const ref = doc(getDb(), 'participantes', id);
      await updateDoc(ref, data);
    } catch (err) {
      console.error('updateParticipant error', err);
      // revert
      if (prev) setParticipants((cur) => cur.map((p) => (p.id === id ? prev : p)));
      throw err;
    }
  };

  const deleteParticipant = async (id) => {
    // optimistic delete: remove locally then try delete, revert on error
    const prev = participants.find((p) => p.id === id);
    setParticipants((cur) => cur.filter((p) => p.id !== id));
    try {
      await deleteDoc(doc(getDb(), 'participantes', id));
    } catch (err) {
      console.error('deleteParticipant error', err);
      // revert
      if (prev) setParticipants((cur) => [...cur, prev]);
      throw err;
    }
  };

  const refresh = async () => {
    try {
      setLoading(true);
      const col = collection(getDb(), 'participantes');
      const snapshot = await getDocs(firestoreQuery(col, orderBy('timestamp', 'desc'), firestoreLimit(PAGE_SIZE)));
      const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setParticipants(rows);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setError('');
    } catch (err) {
      console.error('refresh participants error', err);
      setError(
        err && err.code === 'permission-denied'
          ? 'No hay permisos para leer participantes.'
          : 'No se pudieron cargar participantes.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !lastVisible) return;
    setLoadingMore(true);
    try {
      const col = collection(getDb(), 'participantes');
      const q = firestoreQuery(col, orderBy('timestamp', 'desc'), startAfter(lastVisible), firestoreLimit(PAGE_SIZE));
      const snapshot = await getDocs(q);
      const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setParticipants((cur) => [...cur, ...rows]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || lastVisible);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('loadMore participants error', err);
      setError('No se pudieron cargar más participantes.');
    } finally {
      setLoadingMore(false);
    }
  };

  const loadPage = async (pageNumber) => {
    if (!user) return;
    const skip = Math.max(0, (pageNumber - 1) * PAGE_SIZE);
    try {
      setLoading(true);
      const col = collection(getDb(), 'participantes');
      // Firestore doesn't expose a performant offset in all SDKs; use limit(skip + PAGE_SIZE)
      // and then take the last PAGE_SIZE results. This is read-inefficient for large skips.
      const limitCount = skip + PAGE_SIZE;
      const q = firestoreQuery(col, orderBy('timestamp', 'desc'), firestoreLimit(limitCount));
      const snapshot = await getDocs(q);
      const allRows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const pageRows = allRows.slice(Math.max(0, allRows.length - PAGE_SIZE));
      setParticipants(pageRows);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(pageRows.length === PAGE_SIZE);
      setError('');
    } catch (err) {
      console.error('loadPage participants error', err);
      setError('No se pudieron cargar participantes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ParticipantsContext.Provider
      value={{ participants, loading, error, addParticipant, updateParticipant, deleteParticipant, refresh, loadMore, loadPage, hasMore, loadingMore, totalCount }}
    >
      {children}
    </ParticipantsContext.Provider>
  );
}

export function useParticipants() {
  const ctx = useContext(ParticipantsContext);
  if (!ctx) throw new Error('useParticipants must be used within ParticipantsProvider');
  return ctx;
}

export default ParticipantsContext;
