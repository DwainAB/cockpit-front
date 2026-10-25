import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createDb, type Db, type DomainContext } from '@/core';

export interface StoreActions {
  /** Remplace toute la base par l'instantané renvoyé par l'API. */
  hydrate: (db: Db) => void;
  /** Mode démo local : applique une fonction métier partagée directement sur le store. */
  runLocal: <T>(fn: (ctx: DomainContext) => T) => T;
  resetLocal: () => void;
}

export type AppState = Db & StoreActions;

/**
 * Store de lecture de l'application. En mode API, il reflète le backend (hydraté au démarrage
 * puis à chaque événement SSE) ; en mode démo, les mutations y sont appliquées localement
 * avec la même logique métier que le serveur (`src/core`, copie de celle du backend).
 */
export const useStore = create<AppState>()(
  immer((set) => {
    const schedule: DomainContext['schedule'] = (ms, fn) => {
      setTimeout(() => set((draft) => void fn(draft)), ms);
    };

    return {
      ...createDb(),
      hydrate: (db) => set(() => db),
      runLocal: <T,>(fn: (ctx: DomainContext) => T) => {
        let result: T | undefined;
        set((draft) => {
          // Copie JSON pour que la valeur renvoyée ne soit ni un brouillon immer ni gelée.
          result = JSON.parse(JSON.stringify(fn({ db: draft, schedule }) ?? null)) as T;
        });
        return result as T;
      },
      resetLocal: () => set(() => createDb()),
    };
  }),
);
