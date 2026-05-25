import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_APP_CONFIG, subscribeAppConfig, getAppConfig } from '../utils/paymentConfig';

const ConfigContext = createContext({ config: DEFAULT_APP_CONFIG, loading: true, error: null });

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_APP_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;
    // If we have a cached config in localStorage, use it immediately so the
    // UI doesn't show the hardcoded default ($8) on cold start. We'll still
    // fetch the authoritative config below and update when available.
    try {
      const cached = localStorage.getItem('appConfig');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && !cancelled) {
          setConfig(parsed);
          setLoading(false);
        }
      }
    } catch (e) {
      // ignore malformed cache
    }

    // First, try to fetch a snapshot of the config once so the app doesn't
    // fall back to the DEFAULT_APP_CONFIG (eventoUsd=8) intermittently.
    (async () => {
      try {
        const initial = await getAppConfig();
        if (cancelled) return;
        setConfig(initial);
        setError(null);
        try {
          localStorage.setItem('appConfig', JSON.stringify(initial));
        } catch (e) {
          // ignore storage errors
        }
      } catch (err) {
        console.error('getAppConfig error:', err);
        if (!cancelled) {
          setError(err);
          setConfig(DEFAULT_APP_CONFIG);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      // Then subscribe to live updates; subscription will update config when available.
      try {
        unsubscribe = subscribeAppConfig((err, nextConfig) => {
          if (cancelled) return;
          if (err) {
            console.error('config subscription error:', err);
            setError(err);
            return;
          }
          setConfig(nextConfig);
          setError(null);
        });
      } catch (err) {
        console.error('subscribeAppConfig error:', err);
      }
    })();

    return () => {
      cancelled = true;
      try {
        if (typeof unsubscribe === 'function') unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Cargando configuración global...</div>;
  }

  return (
    <ConfigContext.Provider value={{ config, loading, error }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}

export default ConfigContext;
