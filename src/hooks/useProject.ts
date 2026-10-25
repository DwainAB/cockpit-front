import { useParams } from 'react-router-dom';
import { useStore } from '@/store';

/** Projet courant d'après l'URL `/p/:projectId/...`. */
export const useProject = () => {
  const { projectId } = useParams();
  return useStore((s) => s.projects.find((p) => p.id === projectId));
};
