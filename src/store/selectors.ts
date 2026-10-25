import { useShallow } from 'zustand/react/shallow';
import { useMemo } from 'react';
import { useStore } from './index';
import { currentBuild, currentStep, dayjs, isOverdue, paths, RESTAURANT_PROJECT, stepMeta, today, type Db } from '@/core';

export type ValidationKind = 'site' | 'content' | 'task';

export interface PendingValidation {
  id: string;
  kind: ValidationKind;
  projectId: string;
  title: string;
  subtitle: string;
  label: string;
  date: string;
  link: string;
  agentId: string;
}

/** Tout ce qui attend une décision de ma part, quelle que soit la source. */
export const selectPendingValidations = (s: Pick<Db, 'restaurants' | 'contents' | 'tasks' | 'drafts'>): PendingValidation[] => {
  const items: PendingValidation[] = [];
  s.restaurants.forEach((r) => {
    const step = currentStep(r);
    if (step?.status === 'awaiting_validation')
      items.push({
        id: `${r.id}:${step.key}`,
        kind: 'site',
        projectId: RESTAURANT_PROJECT,
        title: r.name,
        subtitle: stepMeta(step.key).label,
        label: step.key === 'intake' ? 'Questionnaire' : step.key === 'mockup_review' ? 'Maquette' : step.key === 'visual_review' ? 'Version visuelle' : 'Livraison',
        date: step.date ?? r.updatedAt,
        link: paths.workflow(r.id),
        agentId: step.agentId,
      });
  });
  s.contents.forEach((c) => {
    if (c.status === 'topic_review' || c.status === 'visual_review')
      items.push({
        id: c.id,
        kind: 'content',
        projectId: c.projectId,
        title: c.title,
        subtitle: c.status === 'topic_review' ? 'Sujet à valider' : 'Visuel à valider',
        label: 'Contenu social',
        date: c.history.at(-1)?.date ?? c.scheduledAt,
        link: paths.content(c.projectId, c.id),
        agentId: c.agentId,
      });
  });
  s.drafts.filter((d) => !d.finalizedAt).forEach((d) => {
    const latest = d.versions.at(-1);
    if (latest?.status === 'ready')
      items.push({
        id: latest.id,
        kind: 'site',
        projectId: RESTAURANT_PROJECT,
        title: d.answers.name,
        subtitle: `Design v${latest.number}`,
        label: 'Design',
        date: latest.completedAt ?? latest.createdAt,
        link: paths.draft(d.id),
        agentId: 'agent-design',
      });
  });
  s.drafts.filter((d) => !d.finalizedAt).forEach((d) => {
    const build = currentBuild(d);
    if (build?.status === 'ready')
      items.push({
        id: build.id,
        kind: 'site',
        projectId: RESTAURANT_PROJECT,
        title: d.answers.name,
        subtitle: 'Site développé, tests réussis',
        label: 'Site',
        date: build.completedAt ?? build.createdAt,
        link: paths.draft(d.id),
        agentId: 'agent-dev',
      });
  });
  s.tasks.forEach((t) => {
    if (t.needsMyValidation && t.status === 'awaiting_validation' && !t.ref)
      items.push({ id: t.id, kind: 'task', projectId: t.projectId, title: t.title, subtitle: 'Tâche', label: 'Tâche', date: t.createdAt, link: paths.tasks(t.id), agentId: t.agentId });
  });
  return items.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
};

export const usePendingValidations = (projectId?: string) => {
  const [restaurants, contents, tasks, drafts] = useStore(useShallow((s) => [s.restaurants, s.contents, s.tasks, s.drafts]));
  return useMemo(() => {
    const all = selectPendingValidations({ restaurants, contents, tasks, drafts });
    return projectId ? all.filter((v) => v.projectId === projectId) : all;
  }, [restaurants, contents, tasks, drafts, projectId]);
};

/** Indicateurs clés, pour tous les projets ou un seul. */
export const useKpis = (projectId?: string) => {
  const [restaurants, contents, tasks, finance, drafts] = useStore(useShallow((s) => [s.restaurants, s.contents, s.tasks, s.finance, s.drafts]));
  const pending = usePendingValidations(projectId);
  return useMemo(() => {
    const weekStart = today().startOf('isoWeek');
    const weekEnd = weekStart.add(7, 'day');
    const inScope = (p: string) => !projectId || p === projectId;
    const withRestaurants = inScope(RESTAURANT_PROJECT);
    const monthCosts = finance.projects.filter((f) => inScope(f.projectId)).reduce((sum, f) => sum + (f.monthly.at(-1)?.costs ?? 0), 0);
    return {
      activeRestaurants: withRestaurants ? restaurants.filter((r) => r.status === 'active').length : 0,
      sitesInProduction: withRestaurants ? drafts.filter((d) => !d.finalizedAt).length : 0,
      pendingValidations: pending.length,
      postsThisWeek: contents.filter(
        (c) =>
          inScope(c.projectId) &&
          ['scheduled', 'approved', 'visual_review', 'topic_review', 'preparing'].includes(c.status) &&
          dayjs(c.scheduledAt).isBetween(weekStart, weekEnd, null, '[)'),
      ).length,
      lateTasks: tasks.filter((t) => inScope(t.projectId) && t.status !== 'done' && isOverdue(t.dueDate)).length,
      monthCosts,
    };
  }, [restaurants, contents, tasks, finance, drafts, pending, projectId]);
};

export const useUnreadCount = () => useStore((s) => s.notifications.filter((n) => !n.read).length);

/* Accès par id, réutilisés partout. */
export const useAgent = (id?: string) => useStore((s) => s.agents.find((a) => a.id === id));
export const useAgentsMap = () => {
  const agents = useStore((s) => s.agents);
  return useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a])), [agents]);
};
export const useProjectsMap = () => {
  const projects = useStore((s) => s.projects);
  return useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
};
export const useRestaurantsMap = () => {
  const restaurants = useStore((s) => s.restaurants);
  return useMemo(() => Object.fromEntries(restaurants.map((r) => [r.id, r])), [restaurants]);
};

export interface AgentIssue {
  text: string;
  link: string;
}

/** Problèmes par agent, dérivés des blocages et erreurs en cours. */
export const useAgentIssues = () => {
  const [agents, restaurants, contents, tasks] = useStore(useShallow((s) => [s.agents, s.restaurants, s.contents, s.tasks]));
  return useMemo(() => {
    const map: Record<string, AgentIssue[]> = Object.fromEntries(agents.map((a) => [a.id, a.issue ? [{ text: a.issue, link: paths.agents(a.id) }] : []]));
    restaurants.forEach((r) => {
      const step = currentStep(r);
      if (r.blocker && step) map[step.agentId]?.push({ text: `${r.blocker} — ${r.name}`, link: paths.workflow(r.id) });
    });
    contents
      .filter((c) => c.status === 'error')
      .forEach((c) => map[c.agentId]?.push({ text: `Publication en erreur — ${c.title}`, link: paths.content(c.projectId, c.id) }));
    tasks.filter((t) => t.status === 'blocked').forEach((t) => map[t.agentId]?.push({ text: `Tâche bloquée — ${t.title}`, link: paths.tasks(t.id) }));
    return map;
  }, [agents, restaurants, contents, tasks]);
};
