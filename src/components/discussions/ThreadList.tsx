import { ActionIcon, Badge, Box, Button, Group, ScrollArea, SegmentedControl, Select, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconMessagePlus, IconUsersGroup } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { dayjs, meetingStatus, paths } from '@/core';
import { AgentAvatar, AgentStack, EmptyState, StatusBadge } from '@/components/ui';
import { useAgentsMap, useProjectsMap } from '@/store/selectors';
import { useUi } from '@/store/ui';
import { useThreads } from './threads';

const ALL = 'all';
const TRANSVERSE = 'transverse';

/** `projectId` : liste limitée à ce projet (page Discussions du projet). */
export function ThreadList({ activeId, projectId }: { activeId?: string; projectId?: string }) {
  const threads = useThreads();
  const agents = useAgentsMap();
  const projects = useProjectsMap();
  const openModal = useUi((s) => s.openModal);
  const [kind, setKind] = useState<'all' | 'conversation' | 'meeting'>('all');
  const [chosenScope, setScope] = useState<string>(ALL);
  const scope = projectId ?? chosenScope;

  const filtered = useMemo(
    () =>
      threads.filter(
        (t) => (kind === 'all' || t.kind === kind) && (scope === ALL || (scope === TRANSVERSE ? t.projectId === null : t.projectId === scope)),
      ),
    [threads, kind, scope],
  );

  const formatDate = (d: string) => (dayjs(d).isSame(dayjs(), 'day') ? dayjs(d).format('HH:mm') : dayjs(d).format('D MMM'));

  return (
    <Stack gap={0} h="100%">
      <Stack gap="sm" p="md" pb="sm">
        <Group justify="space-between" wrap="nowrap">
          <Text fw={650}>Discussions</Text>
          <Tooltip label="Nouvelle discussion avec un agent">
            <ActionIcon variant="default" onClick={() => openModal('conversation', { projectId: scope !== ALL && scope !== TRANSVERSE ? scope : undefined })} aria-label="Nouvelle discussion">
              <IconMessagePlus size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Button fullWidth leftSection={<IconUsersGroup size={16} />} onClick={() => openModal('meeting', { projectId: scope !== ALL && scope !== TRANSVERSE ? scope : undefined })}>
          Nouvelle réunion
        </Button>
        <SegmentedControl
          size="xs"
          fullWidth
          value={kind}
          onChange={(v) => setKind(v as typeof kind)}
          data={[
            { value: 'all', label: 'Tout' },
            { value: 'conversation', label: 'Agents' },
            { value: 'meeting', label: 'Réunions' },
          ]}
        />
        {!projectId && (
        <Select
          size="xs"
          allowDeselect={false}
          value={scope}
          onChange={(v) => setScope(v ?? ALL)}
          data={[{ value: ALL, label: 'Tous les projets' }, ...Object.values(projects).map((p) => ({ value: p.id, label: p.name })), { value: TRANSVERSE, label: 'Réunions transverses' }]}
        />
        )}
      </Stack>
      <ScrollArea style={{ flex: 1 }}>
        <Stack gap={2} px="xs" pb="xs">
          {filtered.map((t) => {
            const active = t.id === activeId;
            const project = t.projectId ? projects[t.projectId] : null;
            return (
              <UnstyledButton key={t.id} component={Link} to={paths.discussions(t.id, projectId)} p="sm" style={{ borderRadius: 10, background: active ? 'var(--mantine-color-night-0)' : undefined }}>
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  {t.kind === 'conversation' ? (
                    <AgentAvatar agent={agents[t.agentIds[0]]} size={36} withStatus />
                  ) : (
                    <Box w={36} style={{ flexShrink: 0 }}>
                      <AgentStack agentIds={t.agentIds} max={2} />
                    </Box>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Group justify="space-between" wrap="nowrap" gap={4}>
                      <Text size="sm" fw={600} truncate>
                        {t.title}
                      </Text>
                      <Text size="10px" c="dimmed" style={{ flexShrink: 0 }}>
                        {formatDate(t.date)}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {t.preview}
                    </Text>
                    <Group gap={4} mt={4}>
                      <Badge size="xs" variant="light" tt="none" color={project ? 'gray' : 'grape'} leftSection={project ? <Box w={6} h={6} style={{ borderRadius: 6, background: project.color }} /> : undefined}>
                        {project ? project.name : 'Tous les projets'}
                      </Badge>
                      {t.kind === 'meeting' && t.status && <StatusBadge meta={meetingStatus[t.status]} size="xs" dot={false} />}
                    </Group>
                  </div>
                </Group>
              </UnstyledButton>
            );
          })}
          {!filtered.length && <EmptyState compact title="Aucune discussion" description="Démarrez une réunion ou une discussion avec un agent." />}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
