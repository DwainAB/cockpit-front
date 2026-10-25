import { create } from 'zustand';

export type ApiMode = 'http' | 'mock';
export type ConnectionStatus = 'connecting' | 'ready' | 'error';

interface ConnectionState {
  mode: ApiMode;
  status: ConnectionStatus;
  error: string | null;
  /** Le flux temps réel (SSE) est-il ouvert ? */
  live: boolean;
  set: (patch: Partial<Omit<ConnectionState, 'set'>>) => void;
}

/** Mode d'accès aux données : API Node.js (par défaut) ou démo 100 % locale. */
export const useConnection = create<ConnectionState>((set) => ({
  mode: import.meta.env.VITE_API_MODE === 'mock' ? 'mock' : 'http',
  status: import.meta.env.VITE_API_MODE === 'mock' ? 'ready' : 'connecting',
  error: null,
  live: false,
  set: (patch) => set(patch),
}));

export const isMock = () => useConnection.getState().mode === 'mock';
