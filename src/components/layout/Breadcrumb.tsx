import { Anchor, Breadcrumbs, Text } from '@mantine/core';
import { Link, useLocation } from 'react-router-dom';
import { paths } from '@/core';
import { useStore } from '@/store';
import { globalNav } from './nav';

const sectionLabels: Record<string, string> = {
  restaurants: 'Restaurants',
  production: 'Production des sites',
  communication: 'Communication',
  finance: 'Finance',
};

/** Fil d'Ariane déduit de l'URL, avec les noms réels des entités. */
export function Breadcrumb() {
  const { pathname } = useLocation();
  const { projects, restaurants, contents, meetings, conversations, agents, drafts } = useStore();
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; to?: string }[] = [];

  if (parts[0] === 'p') {
    const project = projects.find((p) => p.id === parts[1]);
    crumbs.push({ label: project?.name ?? 'Projet introuvable', to: project ? paths.project(project.id) : undefined });
    if (parts[2]) crumbs.push({ label: sectionLabels[parts[2]] ?? parts[2], to: `/p/${parts[1]}/${parts[2]}` });
    if (parts[3])
      crumbs.push({
        label:
          (parts[2] === 'communication'
            ? contents.find((c) => c.id === parts[3])?.title
            : parts[2] === 'production'
              ? parts[3] === 'nouveau'
                ? 'Nouveau formulaire'
                : drafts.find((d) => d.id === parts[3])?.answers.name
              : restaurants.find((r) => r.id === parts[3])?.name) ?? 'Introuvable',
      });
  } else if (parts[0] === 'settings') {
    crumbs.push({ label: 'Paramètres' });
  } else {
    const section = globalNav.find((n) => n.to === `/${parts[0] ?? ''}`);
    crumbs.push({ label: section?.label ?? 'Page introuvable', to: section?.to });
    if (parts[0] === 'discussions' && parts[1]) {
      const meeting = meetings.find((m) => m.id === parts[1]);
      const conv = conversations.find((c) => c.id === parts[1]);
      crumbs.push({ label: meeting?.title ?? (conv ? agents.find((a) => a.id === conv.agentId)?.name ?? '' : 'Introuvable') });
    }
  }

  return (
    <Breadcrumbs separatorMargin={6} styles={{ root: { flexWrap: 'nowrap', minWidth: 0 } }}>
      {crumbs.map((c, i) =>
        c.to && i < crumbs.length - 1 ? (
          <Anchor key={i} component={Link} to={c.to} size="sm" c="dimmed">
            {c.label}
          </Anchor>
        ) : (
          <Text key={i} size="sm" fw={600} truncate maw={{ base: 140, sm: 320 }}>
            {c.label}
          </Text>
        ),
      )}
    </Breadcrumbs>
  );
}
