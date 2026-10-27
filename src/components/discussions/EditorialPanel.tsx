import { Alert, Anchor, Button, Group, Modal, Select, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { IconCheck, IconSparkles } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { type Conversation, dayjs, type EditorialIdea, paths } from '@/core';
import { api } from '@/api';
import { IdeaItem } from '@/components/domain/PostIdeasCard';
import { notifySuccess } from '@/lib/notify';
import { useStore } from '@/store';

const fmtSlot = (iso: string) => dayjs(iso).format('dddd D MMMM · HH:mm');

/** Discussion éditoriale : valider les idées retenues, qui deviennent les posts de la semaine. */
export function EditorialPanel({ conv, agentName }: { conv: Conversation; agentName: string }) {
  const contents = useStore((s) => s.contents);
  const [ideas, setIdeas] = useState<EditorialIdea[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorial = conv.editorial;
  if (!editorial) return null;

  if (editorial.confirmedAt) {
    const posts = contents.filter((c) => editorial.contentIds.includes(c.id));
    return (
      <Alert color="sage" variant="light" icon={<IconCheck size={16} />} mx="md" mb="xs" p="xs">
        <Text size="xs" mb={4}>
          Idées validées. Les posts :
        </Text>
        <Stack gap={2}>
          {posts.map((p) => (
            <Anchor key={p.id} component={Link} to={paths.content(p.projectId, p.id)} size="xs">
              {dayjs(p.scheduledAt).format('ddd D')} — {p.title}
            </Anchor>
          ))}
        </Stack>
      </Alert>
    );
  }

  const extract = async () => {
    setLoading(true);
    try {
      setIdeas(await api.conversations.extractIdeas(conv.id));
    } finally {
      setLoading(false);
    }
  };
  const confirm = async () => {
    if (!ideas) return;
    setSaving(true);
    try {
      await api.conversations.confirmIdeas(conv.id, ideas);
      notifySuccess('Idées validées', `${agentName} crée les posts : vous serez prévenu pour les valider.`);
      setIdeas(null);
    } finally {
      setSaving(false);
    }
  };
  const set = (i: number, patch: Partial<EditorialIdea>) => setIdeas((list) => list && list.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <>
      <Group justify="space-between" mx="md" mb={4} px="xs" py={4} wrap="nowrap" gap="xs" style={{ background: 'var(--app-surface-2)', borderRadius: 8 }}>
        <Text size="xs" c="dimmed" truncate>
          {editorial.slots.length} post(s) à préparer : {editorial.slots.map((s) => dayjs(s).format('ddd D')).join(', ')}
        </Text>
        <Button size="compact-xs" variant="light" leftSection={<IconSparkles size={12} />} loading={loading} onClick={() => void extract()}>
          Tout valider
        </Button>
      </Group>
      <Modal opened={!!ideas} onClose={() => setIdeas(null)} title={<Text fw={650}>Posts de la semaine</Text>} size="lg">
        <Stack>
          <Text size="sm" c="dimmed">
            {agentName} a résumé les idées retenues. Ajustez-les si besoin : à la confirmation, {agentName} crée chaque post (textes + image) et vous les soumet.
          </Text>
          {ideas?.map((idea, i) => (
            <Stack key={i} gap={6} p="sm" style={{ border: '1px solid var(--app-border)', borderRadius: 10 }}>
              <Select
                size="xs"
                label="Date"
                allowDeselect={false}
                data={editorial.slots.map((s) => ({ value: s, label: fmtSlot(s) }))}
                value={idea.scheduledAt}
                onChange={(v) => v && set(i, { scheduledAt: v })}
              />
              <TextInput label="Titre" value={idea.title} onChange={(e) => set(i, { title: e.currentTarget.value })} />
              <Textarea label="Angle et message" autosize minRows={2} value={idea.objective} onChange={(e) => set(i, { objective: e.currentTarget.value })} />
            </Stack>
          ))}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setIdeas(null)}>
              Continuer la discussion
            </Button>
            <Button loading={saving} disabled={!ideas?.every((x) => x.title.trim())} onClick={() => void confirm()}>
              Créer les posts
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

/** Idées proposées dans la discussion, affichées dans le fil sous les messages : Valider, Retenir ou Écarter. */
export function DiscussionIdeas({ conv, agentName }: { conv: Conversation; agentName: string }) {
  const project = useStore((s) => s.projects.find((p) => p.id === conv.projectId));
  // Encore à trier (les idées validées sont devenues des posts, les écartées disparaissent).
  const ideas = (project?.ideas ?? []).filter((i) => i.conversationId === conv.id && (i.status === 'proposed' || i.status === 'kept'));
  if (!project || !conv.editorial || !ideas.length) return null;
  return (
    <Stack gap={6} maw={560} ml={44}>
      <Text size="xs" c="dimmed">
        Idées de {agentName} : Valider pour un post de la semaine, Retenir pour une prochaine fois, ou Écarter.
      </Text>
      {ideas.map((idea) => (
        <IdeaItem key={idea.id} idea={idea} project={project} />
      ))}
    </Stack>
  );
}
