import type { Db } from '@/core';
import { useStore } from '@/store';
import { useConnection } from './connection';
import { apiUrl, request } from './http';

/** Délai avant de rouvrir le flux temps réel après une coupure définitive. */
const RECONNECT_MS = 2000;

let lastVersion = -1;
let inflight: Promise<void> | null = null;
/** Un changement est arrivé pendant un rechargement : l'instantané en cours est peut-être déjà périmé. */
let stale = false;

/** Recharge l'instantané complet depuis l'API et hydrate le store. */
export const refresh = (): Promise<void> => {
  if (inflight) {
    stale = true;
    return inflight;
  }
  inflight = request<{ version: number; db: Db }>('GET', '/bootstrap')
    .then(({ version, db }) => {
      if (version !== lastVersion) {
        lastVersion = version;
        useStore.getState().hydrate(db);
      }
    })
    .finally(() => {
      inflight = null;
      if (stale) {
        stale = false;
        void refresh().catch(() => undefined);
      }
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
  let retry: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const open = () => {
    source = new EventSource(apiUrl('/events'));
    source.addEventListener('ready', () => useConnection.getState().set({ live: true }));
    source.addEventListener('change', (e) => {
      const { version } = JSON.parse((e as MessageEvent<string>).data) as { version: number };
      if (version !== lastVersion) void refresh().catch(() => undefined);
    });
    // À la (re)connexion, rechargement forcé : la version repart de zéro quand le serveur redémarre.
    source.onopen = () => {
      lastVersion = -1;
      void refresh().catch(() => undefined);
    };
    source.onerror = () => {
      useConnection.getState().set({ live: false });
      // EventSource se reconnecte seul après une coupure réseau, mais abandonne pour de bon après une réponse
      // en erreur (API en cours de redémarrage derrière le proxy Vite) : on rouvre alors le flux nous-mêmes.
      if (source?.readyState === EventSource.CLOSED && !stopped) {
        source.close();
        retry = setTimeout(open, RECONNECT_MS);
      }
    };
  };

  refresh()
    .then(() => {
      useConnection.getState().set({ status: 'ready' });
      if (!stopped) open();
    })
    .catch((err: Error) => useConnection.getState().set({ status: 'error', error: err.message }));

  return () => {
    stopped = true;
    if (retry) clearTimeout(retry);
    source?.close();
    useConnection.getState().set({ live: false });
  };
};
