import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ConfigProvider } from './contexts/ConfigContext';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from './theme';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <ConfigProvider>
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </ThemeProvider>
);
