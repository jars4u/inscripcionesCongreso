import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_APP_CONFIG, subscribeAppConfig } from '../utils/paymentConfig';

const ConfigContext = createContext({ config: DEFAULT_APP_CONFIG, loading: true, error: null });

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_APP_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = subscribeAppConfig((err, nextConfig) => {
      if (cancelled) return;
      if (err) {
        console.error('config subscription error:', err);
        setError(err);
        setConfig(DEFAULT_APP_CONFIG);
        setLoading(false);
        return;
      }
      setConfig(nextConfig);
      setError(null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  if (loading) {
    return <div style={{padding: 40, textAlign: 'center'}}>Cargando configuración global...</div>;
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
