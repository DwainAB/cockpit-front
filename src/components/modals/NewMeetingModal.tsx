import { Button, Checkbox, Group, Modal, SegmentedControl, Select, SimpleGrid, Stack, TagsInput, Text, TextInput, UnstyledButton } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dayjs, paths } from '@/core';
import { api } from '@/api';
import { AgentAvatar } from '@/components/ui';
import { notifySuccess } from '@/lib/notify';
import { useStore } from '@/store';
import type { ModalContext } from '@/store/ui';

const ALL = 'all';

interface Values {
  title: string;
  scope: string;
  agentIds: string[];
  agenda: string[];
  when: 'now' | 'later';
  date: Date | null;
}

/** Réunion avec plusieurs agents, transverse ou propre à un projet. */
export function NewMeetingModal({ opened, onClose, ctx }: { opened: boolean; onClose: () => void; ctx: ModalContext }) {
  const projects = useStore((s) => s.projects);
  const agents = useStore((s) => s.agents);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const form = useForm<Values>({
    initialValues: { title: '', scope: ALL, agentIds: [], agenda: [], when: 'now', date: dayjs().add(1, 'day').hour(10).minute(0).toDate() },
    validate: {
      agentIds: (v) => (!v.length ? 'Choisissez au moins un agent' : null),
      date: (v, values) => (values.when === 'later' && !v ? 'Date requise' : null),
    },
  });

  useEffect(() => {
    if (!opened) return;
    form.reset();
    if (ctx.projectId) form.setFieldValue('scope', ctx.projectId);
    if (ctx.agentIds) form.setFieldValue('agentIds', ctx.agentIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const projectId = form.values.scope === ALL ? null : form.values.scope;
  // Seuls les agents rattachés au projet choisi sont proposés (tous pour une réunion transverse).
  const available = agents.filter((a) => !projectId || a.projectIds.includes(projectId));

  const toggleAgent = (id: string) =>
    form.setFieldValue('agentIds', form.values.agentIds.includes(id) ? form.values.agentIds.filter((x) => x !== id) : [...form.values.agentIds, id]);

  const submit = form.onSubmit(async (v) => {
    const scopeName = projectId ? projects.find((p) => p.id === projectId)?.name : 'Tous les projets';
    setSaving(true);
    const meeting = await api.meetings
      .create({
        title: v.title.trim() || `Réunion — ${scopeName}`,
        date: dayjs(v.when === 'now' ? undefined : v.date).toISOString(),
        projectId,
        agentIds: v.agentIds.filter((id) => available.some((a) => a.id === id)),
        objective: '',
        agenda: v.agenda,
        startNow: v.when === 'now',
      })
      .finally(() => setSaving(false));
    notifySuccess(v.when === 'now' ? 'Réunion démarrée' : 'Réunion planifiée', meeting.title);
    onClose();
    navigate(paths.discussions(meeting.id));
  });

  return (
    <Modal opened={opened} onClose={onClose} title={<Text fw={650}>Nouvelle réunion</Text>} size="lg">
      <form onSubmit={submit}>
        <Stack>
          <Select
            label="Portée"
            allowDeselect={false}
            data={[{ value: ALL, label: 'Tous les projets' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
            {...form.getInputProps('scope')}
          />
          <div>
            <Text size="sm" fw={500} mb={6}>
              Agents participants
            </Text>
            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
              {available.map((a) => {
                const checked = form.values.agentIds.includes(a.id);
                return (
                  <UnstyledButton
                    key={a.id}
                    onClick={() => toggleAgent(a.id)}
                    p="xs"
                    style={{ border: `1px solid ${checked ? 'var(--mantine-color-night-4)' : 'var(--app-border)'}`, background: checked ? 'var(--mantine-color-night-0)' : undefined, borderRadius: 10 }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Checkbox checked={checked} readOnly tabIndex={-1} size="xs" />
                      <AgentAvatar agent={a} size={28} />
                      <div style={{ minWidth: 0 }}>
                        <Text size="sm" fw={600}>
                          {a.name}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {a.role}
                        </Text>
                      </div>
                    </Group>
                  </UnstyledButton>
                );
              })}
            </SimpleGrid>
            {form.errors.agentIds && (
              <Text size="xs" c="red" mt={4}>
                {form.errors.agentIds}
              </Text>
            )}
          </div>
          <TextInput label="Sujet" placeholder="Ex. : point hebdomadaire" {...form.getInputProps('title')} />
          <TagsInput label="Ordre du jour (optionnel)" placeholder="Entrée pour ajouter un point" {...form.getInputProps('agenda')} />
          <Group align="flex-end" grow>
            <SegmentedControl
              data={[
                { value: 'now', label: 'Démarrer maintenant' },
                { value: 'later', label: 'Planifier' },
              ]}
              {...form.getInputProps('when')}
            />
            {form.values.when === 'later' && <DateTimePicker valueFormat="D MMM YYYY · HH:mm" {...form.getInputProps('date')} />}
          </Group>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              {form.values.when === 'now' ? 'Démarrer la réunion' : 'Planifier'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
