import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { DatesProvider } from '@mantine/dates';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/spotlight/styles.css';
import './theme/global.css';
import '@/core'; // initialise la locale française de dayjs
import { theme } from './theme';
import App from './App';
import { HandledApiError } from './api';

// Les erreurs d'API sont déjà affichées en notification : inutile de les remonter en console.
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason instanceof HandledApiError) e.preventDefault();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <DatesProvider settings={{ locale: 'fr', firstDayOfWeek: 1 }}>
        <Notifications position="bottom-right" />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </DatesProvider>
    </MantineProvider>
  </React.StrictMode>,
);
