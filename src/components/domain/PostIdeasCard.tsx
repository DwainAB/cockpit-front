import { Anchor, Badge, Box, Button, Group, Popover, Select, Stack, Text } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { IconBulb, IconCheck, IconSparkles } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dayjs, editorialPlanOf, paths, type PostIdea, type Project, upcomingSlots } from '@/core';
import { api } from '@/api';
import { EmptyState, SectionCard } from '@/components/ui';
import { notifySuccess } from '@/lib/notify';
import { useStore } from '@/store';

const fmtSlot = (iso: string) => dayjs(iso).format('dddd D MMMM · HH:mm');

/** Pistes de l'agent : retenir (en réserve), écarter (ne plus la proposer) ou valider (devient un post). */
export function PostIdeasCard({ project }: { project: Project }) {
  const agentName = useStore((s) => s.agents.find((a) => a.id === editorialPlanOf(project).agentId)?.name ?? 'L’agent');
  const [suggesting, setSuggesting] = useState(false);
  const ideas = project.ideas ?? [];
  const proposed = ideas.filter((i) => i.status === 'proposed');
  const kept = ideas.filter((i) => i.status === 'kept');
  const validated = ideas.filter((i) => i.status === 'validated').slice(0, 3);

  const suggest = async () => {
    setSuggesting(true);
    try {
      await api.projects.suggestIdeas(project.id);
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <SectionCard
      title="Pistes proposées par l’agent"
      icon={<IconBulb size={18} />}
      action={
        <Button size="compact-xs" variant="light" leftSection={<IconSparkles size={12} />} loading={suggesting} onClick={() => void suggest()}>
          Proposer des pistes
        </Button>
      }
    >
      {proposed.length || kept.length ? (
        <Stack gap="sm">
          {[...proposed, ...kept].map((idea) => (
            <IdeaItem key={idea.id} idea={idea} project={project} />
          ))}
        </Stack>
      ) : (
        <EmptyState compact title="Aucune piste en attente" description={`Demandez à ${agentName} de proposer des sujets.`} />
      )}
      {validated.length > 0 && (
        <Stack gap={2} mt="sm">
          <Text size="xs" c="dimmed">
            Récemment validées :
          </Text>
          {validated.map((i) => (
            <Anchor key={i.id} component={Link} to={paths.content(project.id, i.contentId ?? '')} size="xs">
              {i.title}
            </Anchor>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

export function IdeaItem({ idea, project }: { idea: PostIdea; project: Project }) {
  const slots = upcomingSlots(project);
  const [date, setDate] = useState<string | null>(slots[0] ?? null);
  const [custom, setCustom] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  const status = (s: 'proposed' | 'kept' | 'dismissed') => void api.projects.setIdeaStatus(project.id, idea.id, s);
  const validate = async () => {
    const when = custom ? custom.toISOString() : date;
    if (!when) return;
    setBusy(true);
    try {
      await api.projects.validateIdea(project.id, idea.id, when);
      notifySuccess('Piste validée', `Le post du ${fmtSlot(when)} est en cours de création.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box p="sm" style={{ background: 'var(--app-surface-2)', borderRadius: 10 }}>
      <Group gap={6} wrap="nowrap" align="flex-start">
        <Text size="sm" fw={500} style={{ flex: 1 }}>
          {idea.title}
        </Text>
        {idea.status === 'kept' && (
          <Badge size="xs" variant="light" color="yellow" tt="none">
            En réserve
          </Badge>
        )}
      </Group>
      <Text size="xs" c="dimmed">
        {idea.reason}
      </Text>
      <Group gap={6} mt={6}>
        <Popover width={300} position="bottom-start" withArrow trapFocus>
          <Popover.Target>
            <Button size="compact-xs" color="sage" leftSection={<IconCheck size={12} />}>
              Valider
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="xs">
              <Text size="xs">Pour quel post de la semaine ?</Text>
              {slots.length > 0 && (
                <Select
                  size="xs"
                  data={slots.map((s) => ({ value: s, label: fmtSlot(s) }))}
                  value={custom ? null : date}
                  placeholder="Autre date ci-dessous"
                  onChange={(v) => {
                    setDate(v);
                    setCustom(null);
                  }}
                />
              )}
              <DateTimePicker size="xs" placeholder="Autre date" valueFormat="D MMM YYYY · HH:mm" minDate={new Date()} value={custom} onChange={setCustom} clearable />
              <Button size="xs" loading={busy} disabled={!custom && !date} onClick={() => void validate()}>
                Créer le post
              </Button>
            </Stack>
          </Popover.Dropdown>
        </Popover>
        {idea.status === 'proposed' ? (
          <Button size="compact-xs" variant="light" onClick={() => status('kept')}>
            Retenir
          </Button>
        ) : (
          <Button size="compact-xs" variant="light" color="gray" onClick={() => status('proposed')}>
            Sortir de la réserve
          </Button>
        )}
        <Button size="compact-xs" variant="subtle" color="gray" onClick={() => status('dismissed')}>
          Écarter
        </Button>
      </Group>
    </Box>
  );
}
