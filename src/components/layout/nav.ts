import { IconBuildingStore, IconChecklist, IconCoin, IconHome2, IconMessages, IconRobot, IconSpeakerphone, IconStack2 } from '@tabler/icons-react';
import { paths, type Project } from '@/core';

/** Navigation générale, commune à tous les projets. */
export const globalNav = [
  { to: paths.home(), label: 'Vue d’ensemble', icon: IconHome2 },
  { to: paths.discussions(), label: 'Toutes les discussions', icon: IconMessages },
  { to: paths.tasks(), label: 'Tâches', icon: IconChecklist },
  { to: paths.finance(), label: 'Finance', icon: IconCoin },
  { to: paths.agents(), label: 'Agents', icon: IconRobot },
];

/** Sections d'un projet, selon ses modules. */
export const projectNav = (p: Project) => [
  ...(p.modules.includes('restaurants') ? [{ to: paths.project(p.id), label: 'Accueil', icon: IconHome2, exact: true }] : []),
  ...(p.modules.includes('restaurants') ? [{ to: paths.restaurants(), label: 'Restaurants', icon: IconBuildingStore }] : []),
  ...(p.modules.includes('production') ? [{ to: paths.production(), label: 'Production des sites', icon: IconStack2 }] : []),
  ...(p.modules.includes('communication') ? [{ to: paths.communication(p.id), label: 'Communication', icon: IconSpeakerphone }] : []),
  { to: paths.discussions(undefined, p.id), label: 'Discussions', icon: IconMessages },
  { to: paths.finance(p.id), label: 'Finance', icon: IconCoin },
];
