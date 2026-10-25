import { Badge, Group, Text, Tooltip } from '@mantine/core';
import { IconUserCheck } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { AgentChip, DataTable, StatusBadge, type Column } from '@/components/ui';
import { fmtShort, isOverdue, type Task, taskPriority, taskStatus } from '@/core';
import { useProjectsMap, useRestaurantsMap } from '@/store/selectors';
import { useUi } from '@/store/ui';

const priorityRank = { urgent: 0, high: 1, medium: 2, low: 3 };

export function TaskTable({ tasks, empty, hideProject }: { tasks: Task[]; empty?: ReactNode; hideProject?: boolean }) {
  const projects = useProjectsMap();
  const restaurants = useRestaurantsMap();
  const openTask = useUi((s) => s.openTask);

  const columns: Column<Task>[] = [
    {
      key: 'title',
      header: 'Tâche',
      sortValue: (t) => t.title,
      render: (t) => (
        <Group gap={8} wrap="nowrap">
          {t.needsMyValidation && t.status === 'awaiting_validation' && (
            <Tooltip label="À valider par moi">
              <Badge size="sm" circle variant="filled" color="night" style={{ flexShrink: 0 }}>
                <IconUserCheck size={11} />
              </Badge>
            </Tooltip>
          )}
          <Text size="sm" fw={500} lineClamp={2} td={t.status === 'done' ? 'line-through' : undefined} c={t.status === 'done' ? 'dimmed' : undefined}>
            {t.title}
          </Text>
        </Group>
      ),
    },
    ...(hideProject
      ? []
      : [
          {
            key: 'project',
            header: 'Projet / client',
            sortValue: (t: Task) => projects[t.projectId]?.name ?? '',
            render: (t: Task) => (
              <div>
                <Text size="xs">{projects[t.projectId]?.name}</Text>
                {t.restaurantId && (
                  <Text size="xs" c="dimmed">
                    {restaurants[t.restaurantId]?.name}
                  </Text>
                )}
              </div>
            ),
          } satisfies Column<Task>,
        ]),
    { key: 'agent', header: 'Responsable', render: (t) => <AgentChip agentId={t.agentId} size="xs" /> },
    { key: 'priority', header: 'Priorité', sortValue: (t) => priorityRank[t.priority], render: (t) => <StatusBadge meta={taskPriority[t.priority]} size="xs" /> },
    {
      key: 'due',
      header: 'Échéance',
      sortValue: (t) => t.dueDate,
      render: (t) => (
        <Text size="sm" c={t.status !== 'done' && isOverdue(t.dueDate) ? 'red' : undefined} fw={t.status !== 'done' && isOverdue(t.dueDate) ? 600 : undefined}>
          {fmtShort(t.dueDate)}
        </Text>
      ),
    },
    { key: 'status', header: 'Statut', sortValue: (t) => t.status, render: (t) => <StatusBadge meta={taskStatus[t.status]} /> },
  ];

  return <DataTable rows={tasks} columns={columns} rowKey={(t) => t.id} onRowClick={(t) => openTask(t.id)} empty={empty} defaultSort={{ key: 'due', dir: 'asc' }} />;
}
