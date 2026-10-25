import { useEffect, useState, type DependencyList } from 'react';

/** Données chargées à la demande (hors store) : relance quand `deps` change ou via `reload`. */
export function useRemote<T>(load: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    load()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((err: unknown) => alive && setState((s) => ({ data: s.data, loading: false, error: err instanceof Error ? err.message : 'Erreur inconnue' })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}
