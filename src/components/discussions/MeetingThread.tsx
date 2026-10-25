import { ActionIcon, Anchor, Badge, Box, Button, Group, List, ScrollArea, Stack, Text, TextInput } from '@mantine/core';
import { IconArrowRight, IconBrain, IconListCheck, IconPlayerPlay, IconPlayerStop, IconPlus, IconSpeakerphone } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { capitalize, dayjs, meetingStatus, paths, type Meeting, type MeetingItem } from '@/core';
import { api } from '@/api';
import { AgentStack, StatusBadge } from '@/components/ui';
import { notifyInfo, notifySuccess } from '@/lib/notify';
import { useStore } from '@/store';
import { useAgentsMap } from '@/store/selectors';
import { useUi } from '@/store/ui';
import { Label } from './ConversationThread';
import { Bubble, Composer, ThreadHeader, TypingIndicator } from './parts';

export function MeetingThread({ meeting: m, onBack, onOpenDetails }: { meeting: Meeting; onBack?: () => void; onOpenDetails?: () => void }) {
  const agents = useAgentsMap();
  const project = useStore((s) => s.projects.find((p) => p.id === m.projectId));
  const typing = useStore((s) => s.typing[m.id]);
  const viewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
  }, [m.transcript.length, typing, m.id]);

  const lastSpeaker = [...m.transcript].reverse().find((t) => t.speaker !== 'me' && t.speaker !== 'system')?.speaker;
  const nextSpeaker = agents[m.agentIds.find((id) => id !== lastSpeaker) ?? m.agentIds[0]];

  return (
    <>
      <ThreadHeader
        onBack={onBack}
        onOpenDetails={onOpenDetails}
        left={
          <>
            <AgentStack agentIds={m.agentIds} max={3} />
            <div style={{ minWidth: 0 }}>
              <Text fw={650} truncate>
                {m.title}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {project ? project.name : 'Tous les projets'} · {m.agentIds.map((id) => agents[id]?.name).join(', ')}
              </Text>
            </div>
          </>
        }
        right={
          <>
            <StatusBadge meta={meetingStatus[m.status]} />
            {m.status === 'planned' && (
              <Button size="xs" leftSection={<IconPlayerPlay size={14} />} onClick={async () => { await api.meetings.setStatus(m.id, 'in_progress'); notifyInfo('Réunion démarrée'); }}>
                Démarrer
              </Button>
            )}
            {m.status === 'in_progress' && (
              <Button size="xs" color="sage" variant="light" leftSection={<IconPlayerStop size={14} />} onClick={async () => { await api.meetings.setStatus(m.id, 'done'); notifySuccess('Réunion clôturée', 'Compte rendu archivé.'); }}>
                Clôturer
              </Button>
            )}
          </>
        }
      />
      <ScrollArea style={{ flex: 1 }} viewportRef={viewport}>
        <Stack gap="md" p="md">
          <Text size="xs" c="dimmed" ta="center">
            {capitalize(dayjs(m.date).format('dddd D MMMM YYYY · HH:mm'))}
          </Text>
          {m.transcript.map((t) => (
            <Bubble
              key={t.id}
              from={t.speaker === 'me' ? 'me' : t.speaker === 'system' ? 'system' : 'agent'}
              agent={agents[t.speaker]}
              text={t.text}
              time={t.time}
              showAuthor
            />
          ))}
          {!m.transcript.length && (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              {m.status === 'planned' ? 'Réunion planifiée. Écrivez un premier message ou démarrez-la pour ouvrir la séance.' : 'Aucun échange.'}
            </Text>
          )}
          {typing && <TypingIndicator agent={nextSpeaker} />}
        </Stack>
      </ScrollArea>
      <Composer
        placeholder={m.status === 'done' ? 'Réunion clôturée' : 'Écrire à tous les participants…'}
        disabled={m.status === 'done' || typing}
        onSend={(text) => api.meetings.sendMessage(m.id, text)}
      />
    </>
  );
}

/** Panneau de réunion : ordre du jour, décisions, idées, sujets à reprendre, mémoire. */
export function MeetingPanel({ meeting: m }: { meeting: Meeting }) {
  const contents = useStore((s) => s.contents);
  const openTask = useUi((s) => s.openTask);
  const [creating, setCreating] = useState(false);
  const pendingItems = [...m.decisions, ...m.ideas].filter((i) => !i.taskId && !i.contentId).length;

  const addItem = async (kind: 'decisions' | 'ideas' | 'followUps', text: string) => {
    await api.meetings.addItem(m.id, kind, text);
    if (kind === 'decisions') notifySuccess('Décision ajoutée', m.projectId ? 'Mémorisée dans le projet.' : 'Mémorisée dans tous les projets.');
  };

  return (
    <Stack gap="lg">
      {m.agenda.length > 0 && (
        <Box>
          <Label>Ordre du jour</Label>
          <List type="ordered" spacing={4} size="sm">
            {m.agenda.map((a) => (
              <List.Item key={a}>{a}</List.Item>
            ))}
          </List>
        </Box>
      )}

      <Box>
        <Label>Décisions</Label>
        <ItemList
          items={m.decisions}
          empty="Aucune décision pour l’instant."
          onOpenTask={openTask}
          render={(d) => {
            const content = contents.find((c) => c.id === d.contentId);
            return content ? (
              <Anchor component={Link} to={paths.content(content.projectId, content.id)} size="xs">
                <Group gap={4}>
                  <IconSpeakerphone size={12} /> Reprise : « {content.title} » <IconArrowRight size={12} />
                </Group>
              </Anchor>
            ) : null;
          }}
        />
        <AddItem placeholder="Ajouter une décision" onAdd={(t) => addItem('decisions', t)} />
      </Box>

      <Box>
        <Label>Idées</Label>
        <ItemList items={m.ideas} empty="Aucune idée notée." onOpenTask={openTask} />
        <AddItem placeholder="Ajouter une idée" onAdd={(t) => addItem('ideas', t)} />
      </Box>

      <Button
        leftSection={<IconListCheck size={16} />}
        variant="light"
        loading={creating}
        disabled={!pendingItems}
        onClick={async () => {
          setCreating(true);
          const n = await api.meetings.createTasks(m.id).finally(() => setCreating(false));
          notifySuccess(`${n} tâche${n > 1 ? 's' : ''} créée${n > 1 ? 's' : ''}`);
        }}
      >
        {pendingItems ? `Créer les tâches (${pendingItems})` : 'Tâches créées'}
      </Button>

      <Box>
        <Label>À reprendre la prochaine fois</Label>
        <ItemList items={m.followUps} empty="Rien à reprendre." onOpenTask={openTask} />
        <AddItem placeholder="Ajouter un sujet" onAdd={(t) => addItem('followUps', t)} />
      </Box>

      {m.memoryAdded.length > 0 && (
        <Box p="sm" style={{ background: 'var(--mantine-color-night-0)', borderRadius: 10 }}>
          <Group gap={6} mb={6}>
            <IconBrain size={16} />
            <Text size="sm" fw={600}>
              Mémoire ajoutée {m.projectId ? 'au projet' : 'à tous les projets'}
            </Text>
          </Group>
          <Stack gap={4}>
            {m.memoryAdded.map((x) => (
              <Text key={x} size="xs">
                • {x}
              </Text>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}

function ItemList({ items, empty, render, onOpenTask }: { items: MeetingItem[]; empty: string; render?: (i: MeetingItem) => React.ReactNode; onOpenTask: (id: string) => void }) {
  if (!items.length)
    return (
      <Text size="xs" c="dimmed">
        {empty}
      </Text>
    );
  return (
    <Stack gap={6}>
      {items.map((i) => (
        <Box key={i.id} p="xs" style={{ background: 'var(--app-surface-2)', borderRadius: 8 }}>
          <Text size="sm">{i.text}</Text>
          {render?.(i)}
          {i.taskId && (
            <Badge mt={4} size="xs" variant="light" color="sage" tt="none" className="clickable" onClick={() => onOpenTask(i.taskId!)}>
              Tâche créée — ouvrir
            </Badge>
          )}
        </Box>
      ))}
    </Stack>
  );
}

function AddItem({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => Promise<unknown> }) {
  const [v, setV] = useState('');
  const submit = async () => {
    if (!v.trim()) return;
    await onAdd(v.trim());
    setV('');
  };
  return (
    <TextInput
      mt={6}
      size="xs"
      placeholder={placeholder}
      value={v}
      onChange={(e) => setV(e.currentTarget.value)}
      onKeyDown={(e) => e.key === 'Enter' && submit()}
      rightSection={
        <ActionIcon size="sm" variant="subtle" onClick={submit} aria-label="Ajouter">
          <IconPlus size={14} />
        </ActionIcon>
      }
    />
  );
}
