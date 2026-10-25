import { useNavigate } from 'react-router-dom';
import { paths } from '@/core';
import { api } from '@/api';

/** Ouvre (ou crée) la discussion avec un agent sur un projet, puis l'affiche. */
export const useOpenConversation = () => {
  const navigate = useNavigate();
  return async (agentId: string, projectId: string) => {
    const conv = await api.conversations.create({ agentId, projectId });
    navigate(paths.discussions(conv.id));
  };
};
