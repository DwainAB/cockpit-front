import { useEffect, useState } from 'react';
import { isMock } from '@/api/connection';

/**
 * En mode démo local, simule le temps de chargement d'une API à l'ouverture d'une page.
 * En mode API, les données sont déjà chargées par `DataGate` : aucun délai artificiel.
 */
export const useSimulatedLoading = (ms = 450) => {
  const [loading, setLoading] = useState(isMock);
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms, loading]);
  return loading;
};
