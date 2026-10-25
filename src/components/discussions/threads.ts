import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Meeting } from '@/core';
import { useStore } from '@/store';

export interface ThreadSummary {
  kind: 'conversation' | 'meeting';
  id: string;
  title: string;
  preview: string;
  /** `null` : réunion transverse à tous les projets. */
  projectId: string | null;
  agentIds: string[];
  date: string;
  status?: Meeting['status'];
}

/** Conversations et réunions réunies dans une seule liste, la plus récente en premier. */
export const useThreads = () => {
  const [conversations, meetings, agents] = useStore(useShallow((s) => [s.conversations, s.meetings, s.agents]));
  return useMemo(() => {
    const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? 'Agent';
    const list: ThreadSummary[] = [
      ...conversations.map((c) => {
        const last = c.messages.at(-1);
        return {
          kind: 'conversation' as const,
          id: c.id,
          title: agentName(c.agentId),
          preview: last ? `${last.from === 'me' ? 'Vous : ' : ''}${last.text}` : c.title,
          projectId: c.projectId,
          agentIds: [c.agentId],
          date: last?.date ?? '',
        };
      }),
      ...meetings.map((m) => {
        const last = m.transcript.at(-1);
        return {
          kind: 'meeting' as const,
          id: m.id,
          title: m.title,
          preview: last ? `${last.speaker === 'me' ? 'Vous' : last.speaker === 'system' ? '' : agentName(last.speaker)}${last.speaker === 'system' ? '' : ' : '}${last.text}` : m.objective || m.agenda.join(' · '),
          projectId: m.projectId,
          agentIds: m.agentIds,
          date: m.date,
          status: m.status,
        };
      }),
    ];
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [conversations, meetings, agents]);
};
