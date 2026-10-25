import { Spotlight, type SpotlightActionData, type SpotlightActionGroupData } from '@mantine/spotlight';
import { IconBuildingStore, IconChecklist, IconFolder, IconMessages, IconRobot, IconSpeakerphone, IconSearch } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/core';
import { useStore } from '@/store';
import { useUi } from '@/store/ui';
import { projectNav } from './nav';

/** Recherche globale (⌘K / Ctrl+K) sur toutes les entités. */
export function GlobalSearch() {
  const navigate = useNavigate();
  const { projects, restaurants, tasks, contents, meetings, conversations, agents } = useStore();
  const openTask = useUi((s) => s.openTask);

  const actions = useMemo<SpotlightActionGroupData[]>(() => {
    const projectName = (id: string | null) => (id ? projects.find((p) => p.id === id)?.name : 'Tous les projets');
    const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id;
    const group = (label: string, items: SpotlightActionData[]) => ({ group: label, actions: items });
    return [
      group('Projets', projects.map((p) => ({ id: p.id, label: p.name, description: p.category, leftSection: <IconFolder size={18} />, onClick: () => navigate(projectNav(p)[0].to) }))),
      group('Restaurants', restaurants.map((r) => ({ id: r.id, label: r.name, description: `Yumco · ${r.cuisine} · ${r.city}`, leftSection: <IconBuildingStore size={18} />, onClick: () => navigate(paths.restaurant(r.id)) }))),
      group('Contenus', contents.map((c) => ({ id: c.id, label: c.title, description: projectName(c.projectId), leftSection: <IconSpeakerphone size={18} />, onClick: () => navigate(paths.content(c.projectId, c.id)) }))),
      group('Discussions', [
        ...conversations.map((c) => ({ id: c.id, label: `${agentName(c.agentId)} — ${c.title}`, description: projectName(c.projectId), leftSection: <IconMessages size={18} />, onClick: () => navigate(paths.discussions(c.id)) })),
        ...meetings.map((m) => ({ id: m.id, label: m.title, description: `Réunion · ${projectName(m.projectId)}`, leftSection: <IconMessages size={18} />, onClick: () => navigate(paths.discussions(m.id)) })),
      ]),
      group('Tâches', tasks.map((t) => ({ id: t.id, label: t.title, description: projectName(t.projectId), leftSection: <IconChecklist size={18} />, onClick: () => { navigate(paths.tasks()); openTask(t.id); } }))),
      group('Agents', agents.map((a) => ({ id: a.id, label: `${a.name} — ${a.role}`, leftSection: <IconRobot size={18} />, onClick: () => navigate(paths.agents(a.id)) }))),
    ];
  }, [projects, restaurants, tasks, contents, meetings, conversations, agents, navigate, openTask]);

  return (
    <Spotlight
      actions={actions}
      nothingFound="Aucun résultat"
      highlightQuery
      limit={12}
      shortcut={['mod + K', '/']}
      searchProps={{ leftSection: <IconSearch size={18} />, placeholder: 'Rechercher un projet, un restaurant, une discussion…' }}
    />
  );
}
