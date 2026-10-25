import { Badge, Box, Button, Group, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconCalendarEvent, IconCalendarWeek, IconChecklist, IconListCheck, IconSpeakerphone, IconUserCheck } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { capitalize, contentStatus, dayjs, fromNow, networkLabel, paths, today } from '@/core';
import { AgentAvatar, EmptyState, SectionCard, StatusBadge } from '@/components/ui';
import { useStore } from '@/store';
import { useAgentIssues, useAgentsMap, usePendingValidations, useProjectsMap } from '@/store/selectors';
import { useUi } from '@/store/ui';

/** Pastille de projet affichée quand une vue mélange plusieurs projets. */
export function ProjectTag({ projectId }: { projectId: string | null }) {
  const project = useProjectsMap()[projectId ?? ''];
  return (
    <Badge size="xs" variant="light" color="gray" tt="none" style={{ flexShrink: 0 }} leftSection={project ? <Box w={6} h={6} style={{ borderRadius: 6, background: project.color }} /> : undefined}>
      {project?.name ?? 'Tous les projets'}
    </Badge>
  );
}

export function ValidationsBlock({ projectId }: { projectId?: string }) {
  const pending = usePendingValidations(projectId);
  const agents = useAgentsMap();
  const navigate = useNavigate();
  return (
    <SectionCard
      title="À valider"
      icon={<IconUserCheck size={18} />}
      action={pending.length ? <Badge variant="filled" color="night">{pending.length}</Badge> : undefined}
    >
      {pending.length ? (
        <Stack gap={8}>
          {pending.map((p) => (
            <UnstyledButton key={p.id} onClick={() => navigate(p.link)} p="sm" className="hover-lift" style={{ border: '1px solid var(--app-border)', borderRadius: 10 }}>
              <Group justify="space-between" wrap="nowrap" gap="sm">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <AgentAvatar agent={agents[p.agentId]} size={32} />
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" fw={600} truncate>
                      {p.title}
                    </Text>
                    <Group gap={6} wrap="nowrap">
                      {!projectId && <ProjectTag projectId={p.projectId} />}
                      <Text size="xs" c="dimmed" truncate>
                        {p.subtitle} · {fromNow(p.date)}
                      </Text>
                    </Group>
                  </div>
                </Group>
                <Button size="compact-sm" variant="light" style={{ flexShrink: 0 }}>
                  Examiner
                </Button>
              </Group>
            </UnstyledButton>
          ))}
        </Stack>
      ) : (
        <EmptyState compact title="Rien à valider" description="Les agents vous préviendront à la prochaine étape." icon={<IconChecklist size={18} />} />
      )}
    </SectionCard>
  );
}

export function WeekBlock({ projectId }: { projectId?: string }) {
  const { contents, meetings, tasks } = useStore();
  const agents = useAgentsMap();
  const navigate = useNavigate();
  const openTask = useUi((s) => s.openTask);

  const items = useMemo(() => {
    const start = today();
    const end = start.add(7, 'day');
    const inWeek = (d: string) => dayjs(d).isBetween(start, end, null, '[)');
    // Une réunion transverse concerne aussi chaque projet.
    const inScope = (p: string | null) => !projectId || p === projectId || p === null;
    return [
      ...contents
        .filter((c) => inScope(c.projectId) && inWeek(c.scheduledAt) && c.status !== 'published')
        .map((c) => ({ key: c.id, date: c.scheduledAt, kind: 'Publication' as const, projectId: c.projectId as string | null, title: c.title, meta: c.networks.map((n) => networkLabel[n]).join(' · '), onClick: () => navigate(paths.content(c.projectId, c.id)), badge: contentStatus[c.status] })),
      ...meetings
        .filter((m) => inScope(m.projectId) && inWeek(m.date) && m.status !== 'done')
        .map((m) => ({ key: m.id, date: m.date, kind: 'Réunion' as const, projectId: m.projectId, title: m.title, meta: `${m.agentIds.length} agents`, onClick: () => navigate(paths.discussions(m.id)), badge: undefined })),
      ...tasks
        .filter((t) => inScope(t.projectId) && inWeek(t.dueDate) && t.status !== 'done')
        .map((t) => ({ key: t.id, date: t.dueDate, kind: 'Échéance' as const, projectId: t.projectId as string | null, title: t.title, meta: agents[t.agentId]?.name ?? '', onClick: () => openTask(t.id), badge: undefined })),
    ].sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  }, [contents, meetings, tasks, agents, navigate, openTask, projectId]);

  return (
    <SectionCard title="Cette semaine" icon={<IconCalendarWeek size={18} />}>
      {items.length ? (
        <Stack gap={0}>
          {items.map((w, i) => {
            const showDay = i === 0 || !dayjs(items[i - 1].date).isSame(w.date, 'day');
            const Icon = w.kind === 'Publication' ? IconSpeakerphone : w.kind === 'Réunion' ? IconCalendarEvent : IconListCheck;
            return (
              <div key={`${w.kind}-${w.key}`}>
                {showDay && (
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase" mt={i ? 'sm' : 0} mb={4}>
                    {dayjs(w.date).isSame(today(), 'day') ? 'Aujourd’hui' : dayjs(w.date).isSame(today().add(1, 'day'), 'day') ? 'Demain' : capitalize(dayjs(w.date).format('dddd D MMM'))}
                  </Text>
                )}
                <UnstyledButton onClick={w.onClick} w="100%" py={6} px={4} style={{ borderRadius: 6 }}>
                  <Group gap="sm" wrap="nowrap">
                    <Text size="xs" c="dimmed" w={40} style={{ flexShrink: 0 }}>
                      {dayjs(w.date).format('HH:mm')}
                    </Text>
                    <ThemeIcon size={26} radius="md" variant="light" color={w.kind === 'Publication' ? 'blue' : w.kind === 'Réunion' ? 'grape' : 'gray'}>
                      <Icon size={14} />
                    </ThemeIcon>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text size="sm" truncate>
                        {w.title}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {w.kind} · {w.meta}
                      </Text>
                    </div>
                    {!projectId && <ProjectTag projectId={w.projectId} />}
                    {w.badge && <StatusBadge meta={w.badge} size="xs" visibleFrom="sm" />}
                  </Group>
                </UnstyledButton>
              </div>
            );
          })}
        </Stack>
      ) : (
        <EmptyState compact title="Semaine calme" description="Aucune publication, réunion ou échéance prévue." />
      )}
    </SectionCard>
  );
}

export function AlertsBlock() {
  const agents = useStore((s) => s.agents);
  const issues = useAgentIssues();
  const navigate = useNavigate();
  const alerts = agents.flatMap((a) => (issues[a.id] ?? []).map((issue, i) => ({ id: `${a.id}-${i}`, agent: a, ...issue })));
  if (!alerts.length) return null;
  return (
    <SectionCard title="Alertes" icon={<IconAlertTriangle size={18} />} action={<Badge color="red" variant="light">{alerts.length}</Badge>}>
      <Stack gap={8}>
        {alerts.map((a) => (
          <UnstyledButton key={a.id} onClick={() => navigate(a.link)} p="sm" style={{ borderRadius: 10, background: 'var(--mantine-color-red-0)' }}>
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <AgentAvatar agent={a.agent} size={26} />
              <Text size="xs" c="red.9">
                <b>{a.agent.name}</b> — {a.text}
              </Text>
            </Group>
          </UnstyledButton>
        ))}
      </Stack>
    </SectionCard>
  );
}
