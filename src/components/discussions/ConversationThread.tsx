import { Alert, Anchor, Badge, Box, Button, Group, Progress, ScrollArea, Stack, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconFlask, IconMessageCircle, IconPlus } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { conversationContext, currentStepLabel, dayjs, fromNow, paths, restaurantStatus, specialtyLabel, type Conversation } from '@/core';
import { useOpenConversation } from '@/hooks/useOpenConversation';
import { api } from '@/api';
import { isMock } from '@/api/connection';
import { MemoryList } from '@/components/domain/MemoryList';
import { AgentAvatar, StatusBadge } from '@/components/ui';
import { useStore } from '@/store';
import { useAgentsMap } from '@/store/selectors';
import { DiscussionIdeas, EditorialPanel } from './EditorialPanel';
import { Bubble, Composer, ThreadHeader, TypingIndicator } from './parts';

export function ConversationThread({ conv, onBack, onOpenDetails }: { conv: Conversation; onBack?: () => void; onOpenDetails?: () => void }) {
  const agent = useAgentsMap()[conv.agentId];
  const project = useStore((s) => s.projects.find((p) => p.id === conv.projectId));
  const typing = useStore((s) => s.typing[conv.id]);
  const viewport = useRef<HTMLDivElement>(null);

  // Nouvelles idées relevées dans la discussion : elles s'affichent sous les messages.
  const ideaCount = useStore((s) => s.projects.find((p) => p.id === conv.projectId)?.ideas?.filter((i) => i.conversationId === conv.id).length ?? 0);

  useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
  }, [conv.messages.length, typing, conv.id, ideaCount]);

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
                {agent?.name} · {agent && specialtyLabel(agent.kind)}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {project?.name} — {conv.title}
              </Text>
            </div>
          </>
        }
        right={
          <Group gap="xs" wrap="nowrap">
            <ContextGauge conv={conv} />
            {isMock() ? (
            <Tooltip label="Mode démo : les réponses sont pré-écrites">
              <Badge variant="light" color="orange" leftSection={<IconFlask size={12} />} tt="none" visibleFrom="sm">
                Réponses simulées
              </Badge>
            </Tooltip>
          ) : (
            agent && (
              <Tooltip label="Modèle de conversation de l’agent (réglable dans la page Agents)">
                <Badge variant="light" color="gray" leftSection={<IconMessageCircle size={12} />} tt="none" visibleFrom="sm">
                  {agent.models.chat.model}
                </Badge>
              </Tooltip>
            )
          )}
          </Group>
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
          <DiscussionIdeas conv={conv} agentName={agent?.name ?? 'L’agent'} />
          {typing && <TypingIndicator agent={agent} />}
        </Stack>
      </ScrollArea>
      <EditorialPanel conv={conv} agentName={agent?.name ?? 'L’agent'} />
      <ContextWarning conv={conv} agentName={agent?.name ?? 'L’agent'} />
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

/** À partir de ce remplissage, la discussion prévient que l'agent va oublier le début. */
const CONTEXT_WARNING = 0.75;

const contextColor = (ratio: number) => (ratio >= 1 ? 'red' : ratio >= CONTEXT_WARNING ? 'orange' : 'sage');

/** Remplissage du contexte : messages que l'agent voit encore, sur le maximum envoyé au modèle. */
function ContextGauge({ conv }: { conv: Conversation }) {
  const { used, limit, ratio } = conversationContext(conv);
  return (
    <Tooltip label={`Contexte : ${Math.min(used, limit)} messages sur ${limit} envoyés à l’agent à chaque réponse`}>
      <Stack gap={2} w={70}>
        <Text size="10px" c="dimmed" ta="right" lh={1}>
          Contexte {Math.min(used, limit)}/{limit}
        </Text>
        <Progress size="sm" value={ratio * 100} color={contextColor(ratio)} aria-label="Remplissage du contexte" />
      </Stack>
    </Tooltip>
  );
}

/** Proche de la limite : propose de repartir dans une nouvelle discussion (la mémoire de l'agent est conservée). */
function ContextWarning({ conv, agentName }: { conv: Conversation; agentName: string }) {
  const openConversation = useOpenConversation();
  const { used, limit, ratio, full } = conversationContext(conv);
  if (ratio < CONTEXT_WARNING) return null;
  return (
    <Alert color={contextColor(ratio)} variant="light" icon={<IconAlertTriangle size={16} />} mx="md" mb="xs" p="xs">
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Text size="xs">
          {full
            ? `${agentName} ne voit plus les ${used - limit + 1} plus anciens messages. Démarrez une nouvelle discussion : ses souvenirs restent disponibles.`
            : `Plus que ${limit - used} messages avant que ${agentName} oublie le début de la discussion.`}
        </Text>
        <Button size="compact-xs" variant="light" color={contextColor(ratio)} leftSection={<IconPlus size={12} />} onClick={() => void openConversation(conv.agentId, conv.projectId, true)}>
          Nouvelle discussion
        </Button>
      </Group>
    </Alert>
  );
}
