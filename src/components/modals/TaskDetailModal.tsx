import { Alert, Anchor, Badge, Button, Divider, Group, Modal, Select, Stack, Text, Textarea } from '@mantine/core';
import { IconAlertTriangle, IconArrowRight, IconCheck, IconLock, IconUserCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api';
import { fmtDate, fmtDateTime, isOverdue, paths, stepMeta, type Task, taskPriority, taskStatus, type TaskStatus } from '@/core';
import { notifySuccess } from '@/lib/notify';
import { useStore } from '@/store';
import { useAgentsMap, useProjectsMap, useRestaurantsMap } from '@/store/selectors';
import { AgentChip, StatusBadge } from '@/components/ui';

const refLink = (t: Task) => {
  if (t.ref?.type === 'workflow') return { to: paths.workflow(t.ref.restaurantId), label: `Ouvrir l’étape « ${stepMeta(t.ref.stepKey).label} »` };
  if (t.ref?.type === 'content') return { to: paths.content(t.projectId, t.ref.contentId), label: 'Ouvrir le contenu' };
  if (t.ref?.type === 'meeting') return { to: paths.discussions(t.ref.meetingId), label: 'Ouvrir la réunion d’origine' };
  return null;
};

export function TaskDetailModal({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const task = useStore((s) => s.tasks.find((t) => t.id === taskId));
  const agents = useAgentsMap();
  const projects = useProjectsMap();
  const restaurants = useRestaurantsMap();
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  if (!task) return <Modal opened={false} onClose={onClose} />;
  const link = refLink(task);

  const run = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(key);
    await fn().finally(() => setBusy(null));
    notifySuccess(msg, task.title);
  };

  return (
    <Modal opened={!!taskId} onClose={onClose} size="lg" title={<Text fw={650}>Détail de la tâche</Text>}>
      <Stack gap="md">
        <div>
          <Group gap={6} mb={6}>
            <StatusBadge meta={taskStatus[task.status]} />
            <StatusBadge meta={taskPriority[task.priority]} dot={false} variant="outline" />
            {task.needsMyValidation && task.status !== 'done' && (
              <Badge leftSection={<IconUserCheck size={12} />} color="night" variant="light" tt="none">
                À valider par moi
              </Badge>
            )}
          </Group>
          <Text fw={650} size="lg">
            {task.title}
          </Text>
          {task.description && (
            <Text size="sm" c="dimmed" mt={4} style={{ whiteSpace: 'pre-line' }}>
              {task.description}
            </Text>
          )}
        </div>

        <Group gap="xl" wrap="wrap">
          <div>
            <Text size="xs" c="dimmed">
              Projet / client
            </Text>
            <Text size="sm" fw={500}>
              {projects[task.projectId]?.name}
              {task.restaurantId && ` · ${restaurants[task.restaurantId]?.name}`}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              Responsable
            </Text>
            <AgentChip agentId={task.agentId} />
          </div>
          <div>
            <Text size="xs" c="dimmed">
              Date limite
            </Text>
            <Text size="sm" fw={500} c={task.status !== 'done' && isOverdue(task.dueDate) ? 'red' : undefined}>
              {fmtDate(task.dueDate)}
              {task.status !== 'done' && isOverdue(task.dueDate) && ' · en retard'}
            </Text>
          </div>
        </Group>

        {link && (
          <Anchor component={Link} to={link.to} size="sm" onClick={onClose}>
            <Group gap={4}>
              {link.label} <IconArrowRight size={14} />
            </Group>
          </Anchor>
        )}

        {task.status === 'blocked' && (
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
            Cette tâche est bloquée. Ajoutez un commentaire ou changez son statut pour la relancer.
          </Alert>
        )}

        <Divider label="Actions" labelPosition="left" />
        <Group gap="sm" wrap="wrap">
          {task.needsMyValidation && task.status === 'awaiting_validation' && (
            <Button leftSection={<IconCheck size={16} />} color="sage" loading={busy === 'validate'} onClick={() => run('validate', () => api.tasks.validate(task.id), 'Validé')}>
              Valider
            </Button>
          )}
          {task.status !== 'blocked' && task.status !== 'done' && (
            <Button variant="light" color="red" leftSection={<IconLock size={16} />} loading={busy === 'block'} onClick={() => run('block', () => api.tasks.setStatus(task.id, 'blocked'), 'Tâche bloquée')}>
              Bloquer
            </Button>
          )}
          <Select
            w={200}
            size="sm"
            aria-label="Changer le statut"
            value={task.status}
            data={Object.entries(taskStatus).map(([value, m]) => ({ value, label: m.label }))}
            allowDeselect={false}
            onChange={(v) => v && run('status', () => api.tasks.setStatus(task.id, v as TaskStatus), 'Statut mis à jour')}
          />
        </Group>

        <Divider label={`Commentaires (${task.comments.length})`} labelPosition="left" />
        <Stack gap="sm">
          {task.comments.map((c) => (
            <Group key={c.id} align="flex-start" gap="sm" wrap="nowrap">
              <div style={{ minWidth: 0, flex: 1, background: c.author === 'me' ? 'var(--mantine-color-night-0)' : 'var(--app-surface-2)', borderRadius: 10, padding: '8px 12px' }}>
                <Group gap={6} mb={2}>
                  <Text size="xs" fw={600}>
                    {c.author === 'me' ? 'Moi' : c.author === 'system' ? 'Système' : agents[c.author]?.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {fmtDateTime(c.date)}
                  </Text>
                </Group>
                <Text size="sm">{c.text}</Text>
              </div>
            </Group>
          ))}
          {!task.comments.length && (
            <Text size="sm" c="dimmed">
              Aucun commentaire pour l’instant.
            </Text>
          )}
          <Textarea placeholder="Ajouter un commentaire…" autosize minRows={2} value={comment} onChange={(e) => setComment(e.currentTarget.value)} />
          <Group justify="flex-end">
            <Button
              size="xs"
              variant="light"
              disabled={!comment.trim()}
              loading={busy === 'comment'}
              onClick={async () => {
                await run('comment', () => api.tasks.comment(task.id, comment.trim()), 'Commentaire ajouté');
                setComment('');
              }}
            >
              Commenter
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Modal>
  );
}
