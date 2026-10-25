import { Anchor, Badge, Box, Group, ScrollArea, Stack, Text, Tooltip } from '@mantine/core';
import { IconFlask } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { currentStepLabel, dayjs, fromNow, paths, restaurantStatus, type Conversation } from '@/core';
import { api } from '@/api';
import { MemoryList } from '@/components/domain/MemoryList';
import { AgentAvatar, StatusBadge } from '@/components/ui';
import { useStore } from '@/store';
import { useAgentsMap } from '@/store/selectors';
import { Bubble, Composer, ThreadHeader, TypingIndicator } from './parts';

export function ConversationThread({ conv, onBack, onOpenDetails }: { conv: Conversation; onBack?: () => void; onOpenDetails?: () => void }) {
  const agent = useAgentsMap()[conv.agentId];
  const project = useStore((s) => s.projects.find((p) => p.id === conv.projectId));
  const typing = useStore((s) => s.typing[conv.id]);
  const viewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
  }, [conv.messages.length, typing, conv.id]);

  return (
    <>
      <ThreadHeader
        onBack={onBack}
        onOpenDetails={onOpenDetails}
        left={
          <>
            <AgentAvatar agent={agent} size={40} withStatus />
            <div style={{ minWidth: 0 }}>
              <Text fw={650} truncate>
                {agent?.name} · {agent?.role}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {project?.name} — {conv.title}
              </Text>
            </div>
          </>
        }
        right={
          <Tooltip label="Les réponses sont pré-écrites : aucune IA n’est connectée">
            <Badge variant="light" color="orange" leftSection={<IconFlask size={12} />} tt="none" visibleFrom="sm">
              Réponses simulées
            </Badge>
          </Tooltip>
        }
      />
      <ScrollArea style={{ flex: 1 }} viewportRef={viewport}>
        <Stack gap="md" p="md">
          {conv.messages.map((m, i) => (
            <Box key={m.id}>
              {(i === 0 || !dayjs(conv.messages[i - 1].date).isSame(m.date, 'day')) && (
                <Text size="xs" c="dimmed" ta="center" mb="sm">
                  {dayjs(m.date).isSame(dayjs(), 'day') ? 'Aujourd’hui' : dayjs(m.date).format('dddd D MMMM')}
                </Text>
              )}
              <Bubble from={m.from} agent={agent} text={m.text} time={dayjs(m.date).format('HH:mm')} attachment={m.attachment} />
            </Box>
          ))}
          {typing && <TypingIndicator agent={agent} />}
        </Stack>
      </ScrollArea>
      <Composer
        placeholder={`Écrire à ${agent?.name ?? 'l’agent'}…`}
        suggestions={conv.suggestions}
        disabled={typing}
        withAttachments
        onSend={(text, attachment) => api.conversations.send(conv.id, text, attachment)}
      />
    </>
  );
}

/** Ce que l'agent « sait » pour répondre : projet, restaurant, décisions et mémoire. */
export function ConversationContext({ conv }: { conv: Conversation }) {
  const agent = useAgentsMap()[conv.agentId];
  const project = useStore((s) => s.projects.find((p) => p.id === conv.projectId));
  const restaurant = useStore((s) => s.restaurants.find((r) => r.id === conv.restaurantId));
  const meetings = useStore((s) => s.meetings);
  const allTasks = useStore((s) => s.tasks);
  const tasks = allTasks.filter((t) => t.agentId === conv.agentId && t.projectId === conv.projectId && t.status !== 'done');
  const decisions = meetings
    .filter((m) => m.status === 'done' && m.agentIds.includes(conv.agentId) && (m.projectId === conv.projectId || m.projectId === null))
    .flatMap((m) => m.decisions.map((d) => ({ ...d, meeting: m })));

  return (
    <Stack gap="lg">
      <Text size="xs" c="dimmed">
        Informations que l’agent utilise pour répondre (simulation).{' '}
        <Anchor component={Link} to={paths.agents(conv.agentId)} size="xs">
          Configurer {agent?.name}
        </Anchor>
      </Text>
      {project && (
        <Box>
          <Label>Projet</Label>
          <Text size="sm" fw={600}>
            {project.name}
          </Text>
          <Text size="xs" c="dimmed">
            {project.objective}
          </Text>
        </Box>
      )}
      {restaurant && (
        <Box>
          <Label>Restaurant concerné</Label>
          <Group justify="space-between">
            <Text size="sm" fw={600} component={Link} to={paths.restaurant(restaurant.id)}>
              {restaurant.name}
            </Text>
            <StatusBadge meta={restaurantStatus[restaurant.status]} size="xs" />
          </Group>
          <Text size="xs" c="dimmed">
            Étape : {currentStepLabel(restaurant)}
          </Text>
        </Box>
      )}
      <Box>
        <Label>Décisions de réunion pertinentes</Label>
        {decisions.length ? (
          <Stack gap={6}>
            {decisions.map((d) => (
              <Box key={d.id} p="xs" style={{ background: 'var(--mantine-color-grape-0)', borderRadius: 8 }}>
                <Text size="xs">{d.text}</Text>
                <Text size="10px" c="dimmed" component={Link} to={paths.discussions(d.meeting.id)}>
                  {d.meeting.title} · {fromNow(d.meeting.date)}
                </Text>
              </Box>
            ))}
          </Stack>
        ) : (
          <Text size="xs" c="dimmed">
            Aucune décision de réunion liée.
          </Text>
        )}
      </Box>
      {project && (
        <Box>
          <Label>Mémoire du projet</Label>
          <MemoryList notes={project.memory.slice(0, 4)} />
        </Box>
      )}
      <Box>
        <Label>Tâches en cours sur ce projet ({tasks.length})</Label>
        <Stack gap={4}>
          {tasks.map((t) => (
            <Text key={t.id} size="xs">
              • {t.title}
            </Text>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={6}>
      {children}
    </Text>
  );
}
