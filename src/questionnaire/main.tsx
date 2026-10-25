import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { DatesProvider } from '@mantine/dates';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import '../theme/global.css';
import '@/core'; // initialise la locale française de dayjs
import { theme } from '../theme';
import { PublicApiError } from './publicApi';
import { QuestionnairePage } from './QuestionnairePage';

// Les erreurs d'API sont déjà affichées dans la page ou en notification.
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason instanceof PublicApiError) e.preventDefault();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <DatesProvider settings={{ locale: 'fr', firstDayOfWeek: 1 }}>
        <Notifications position="top-center" />
        <QuestionnairePage />
      </DatesProvider>
    </MantineProvider>
  </React.StrictMode>,
);
