import { Button, Group, Modal, Select, SimpleGrid, Stack, Switch, Text, TextInput, Textarea } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useEffect, useState } from 'react';
import { api } from '@/api';
import { dayjs, RESTAURANT_PROJECT, type TaskPriority, taskPriority } from '@/core';
import { notifySuccess } from '@/lib/notify';
import { useStore } from '@/store';
import type { ModalContext } from '@/store/ui';

interface Values {
  title: string;
  description: string;
  projectId: string;
  restaurantId: string | null;
  agentId: string;
  priority: TaskPriority;
  dueDate: Date | null;
  needsMyValidation: boolean;
}

export function NewTaskModal({ opened, onClose, ctx }: { opened: boolean; onClose: () => void; ctx: ModalContext }) {
  const projects = useStore((s) => s.projects);
  const agents = useStore((s) => s.agents);
  const restaurants = useStore((s) => s.restaurants);
  const [saving, setSaving] = useState(false);

  const form = useForm<Values>({
    initialValues: {
      title: '',
      description: '',
      projectId: RESTAURANT_PROJECT,
      restaurantId: null,
      agentId: 'agent-coord',
      priority: 'medium',
      dueDate: dayjs().add(3, 'day').toDate(),
      needsMyValidation: false,
    },
    validate: {
      title: (v) => (v.trim().length < 3 ? 'Titre trop court' : null),
      dueDate: (v) => (!v ? 'Date requise' : null),
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset();
      if (ctx.projectId) form.setFieldValue('projectId', ctx.projectId);
      if (ctx.restaurantId) {
        form.setFieldValue('restaurantId', ctx.restaurantId);
        form.setFieldValue('projectId', RESTAURANT_PROJECT);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const submit = form.onSubmit(async (v) => {
    setSaving(true);
    await api.tasks.create({ ...v, restaurantId: v.projectId === RESTAURANT_PROJECT ? (v.restaurantId ?? undefined) : undefined, dueDate: dayjs(v.dueDate).hour(18).toISOString() }).finally(() => setSaving(false));
    notifySuccess('Tâche créée', v.title);
    onClose();
  });

  return (
    <Modal opened={opened} onClose={onClose} title={<Text fw={650}>Créer une tâche</Text>} size="lg">
      <form onSubmit={submit}>
        <Stack>
          <TextInput label="Titre" withAsterisk data-autofocus {...form.getInputProps('title')} />
          <Textarea label="Description" autosize minRows={2} {...form.getInputProps('description')} />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select label="Projet" data={projects.map((p) => ({ value: p.id, label: p.name }))} allowDeselect={false} {...form.getInputProps('projectId')} />
            <Select label="Restaurant (optionnel)" disabled={form.values.projectId !== RESTAURANT_PROJECT} clearable data={restaurants.map((r) => ({ value: r.id, label: r.name }))} {...form.getInputProps('restaurantId')} />
            <Select label="Agent responsable" data={agents.map((a) => ({ value: a.id, label: `${a.name} — ${a.role}` }))} allowDeselect={false} {...form.getInputProps('agentId')} />
            <Select
              label="Priorité"
              data={Object.entries(taskPriority).map(([value, m]) => ({ value, label: m.label }))}
              allowDeselect={false}
              {...form.getInputProps('priority')}
            />
            <DatePickerInput label="Date limite" withAsterisk valueFormat="D MMMM YYYY" {...form.getInputProps('dueDate')} />
          </SimpleGrid>
          <Switch label="Nécessite ma validation" {...form.getInputProps('needsMyValidation', { type: 'checkbox' })} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              Créer la tâche
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
