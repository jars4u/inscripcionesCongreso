import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  where,
  startAfter,
  getCountFromServer,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { getEventCost } from '../utils/paymentConfig';

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
  const [globalCounts, setGlobalCounts] = useState({ total: null, pagados: null, pendientes: null, exentos: null, legacy: null, loading: false });
  const [activePage, setActivePage] = useState(1);

  const { user } = useAuth();
  const { config } = useConfig();
  const costoCongreso = getEventCost(config);

  const doFetchGlobalCounts = useCallback(async () => {
    setGlobalCounts((s) => ({ ...s, loading: true }));
    try {
      const col = collection(getDb(), 'participantes');
      const qTotal = firestoreQuery(col);
      const qExentos = firestoreQuery(col, where('exento', '==', true));
      const qLegacy = firestoreQuery(col, where('pago', '==', true), where('montoPagado', '==', 0));
      const qPaidWithAmount = firestoreQuery(col, where('montoPagado', '>=', Number(costoCongreso || 0)));

      const [totalSnap, exSnap, legacySnap, paidSnap] = await Promise.all([
        getCountFromServer(qTotal),
        getCountFromServer(qExentos),
        getCountFromServer(qLegacy),
        getCountFromServer(qPaidWithAmount),
      ]);

      const total = (totalSnap && totalSnap.data && totalSnap.data().count) || 0;
      const ex = (exSnap && exSnap.data && exSnap.data().count) || 0;
      const legacy = (legacySnap && legacySnap.data && legacySnap.data().count) || 0;
      const paidAmt = (paidSnap && paidSnap.data && paidSnap.data().count) || 0;

      const pagados = paidAmt + legacy;
      let pendientes = total - ex - pagados;
      if (!Number.isFinite(pendientes) || pendientes < 0) pendientes = 0;

      setGlobalCounts({ total, exentos: ex, legacy, pagados, pendientes, loading: false });
      setTotalCount(total);
    } catch (err) {
      console.warn('Could not fetch global counts', err);
      setGlobalCounts({ total: null, pagados: null, pendientes: null, exentos: null, legacy: null, loading: false });
    }
  }, [costoCongreso]);

  // Fetch initial aggregated counts and refresh when user or cost changes
  useEffect(() => {
    let canceled = false;
    (async () => {
      if (!user) return;
      try {
        await doFetchGlobalCounts();
      } catch (err) {
        if (!canceled) console.warn('Could not fetch global counts', err);
      }
    })();
    return () => { canceled = true; };
  }, [user, costoCongreso, doFetchGlobalCounts]);

  useEffect(() => {
    // only subscribe when we have an authenticated user
    if (!user) {
      setParticipants([]);
      setError('');
      setLoading(false);
      return;
    }
    // Only keep a realtime subscription for the first page. When viewing other pages
    // we fetch via `loadPage` to avoid the snapshot overwriting paged results.
    if (activePage !== 1) {
      // if not on first page, ensure loading is false and avoid subscribing
      setLoading(false);
      return;
    }

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
            // refresh aggregated counts as well
            try { await doFetchGlobalCounts(); } catch (_) {}
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
  }, [user, activePage, doFetchGlobalCounts]);

  const addParticipant = async (data) => {
    // optimistic add: append local entry until server snapshot arrives
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const localDoc = { id: tempId, ...data };
    setParticipants((cur) => [...cur, localDoc]);
    try {
      const ref = await addDoc(collection(getDb(), 'participantes'), data);
      try { await doFetchGlobalCounts(); } catch (_) {}
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
      try { await doFetchGlobalCounts(); } catch (_) {}
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
      try { await doFetchGlobalCounts(); } catch (_) {}
    } catch (err) {
      console.error('deleteParticipant error', err);
      // revert
      if (prev) setParticipants((cur) => [...cur, prev]);
      throw err;
    }
  };

  const refresh = async () => {
    try {
      setActivePage(1);
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
    setActivePage(pageNumber);
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
      const pageRows = allRows.slice(skip, skip + PAGE_SIZE);
      setParticipants(pageRows);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      // if we requested limitCount and received exactly that many docs, there may be more pages
      setHasMore(snapshot.docs.length === limitCount);
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
      value={{ participants, loading, error, addParticipant, updateParticipant, deleteParticipant, refresh, loadMore, loadPage, hasMore, loadingMore, totalCount, globalCounts }}
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
