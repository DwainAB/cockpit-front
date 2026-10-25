import type { Db } from '@/core';
import { useStore } from '@/store';
import { useConnection } from './connection';
import { apiUrl, request } from './http';

let lastVersion = -1;
let inflight: Promise<void> | null = null;

/** Recharge l'instantané complet depuis l'API et hydrate le store. */
export const refresh = () => {
  inflight ??= request<{ version: number; db: Db }>('GET', '/bootstrap')
    .then(({ version, db }) => {
      if (version !== lastVersion) {
        lastVersion = version;
        useStore.getState().hydrate(db);
      }
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
};

/**
 * Démarre la synchronisation avec le backend : chargement initial puis abonnement SSE.
 * Chaque événement `change` (mutation ou effet différé côté serveur) déclenche un rechargement.
 */
export const connect = () => {
  const conn = useConnection.getState();
  conn.set({ status: 'connecting', error: null });
  let source: EventSource | null = null;

  refresh()
    .then(() => {
      useConnection.getState().set({ status: 'ready' });
      source = new EventSource(apiUrl('/events'));
      source.addEventListener('ready', () => useConnection.getState().set({ live: true }));
      source.addEventListener('change', (e) => {
        const { version } = JSON.parse((e as MessageEvent<string>).data) as { version: number };
        if (version !== lastVersion) void refresh().catch(() => undefined);
      });
      // EventSource se reconnecte seul ; on resynchronise à la reprise.
      source.onerror = () => useConnection.getState().set({ live: false });
      source.onopen = () => void refresh().catch(() => undefined);
    })
    .catch((err: Error) => useConnection.getState().set({ status: 'error', error: err.message }));

  return () => {
    source?.close();
    useConnection.getState().set({ live: false });
  };
};
