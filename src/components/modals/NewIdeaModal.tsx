import { Button, Checkbox, Group, Modal, Select, SimpleGrid, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api';
import { type ContentFormat, dayjs, formatLabel, type Network, networkLabel, nextMonday, paths } from '@/core';
import { notifySuccess } from '@/lib/notify';
import { useStore } from '@/store';
import type { ModalContext } from '@/store/ui';

interface Values {
  projectId: string;
  title: string;
  objective: string;
  networks: Network[];
  format: ContentFormat;
  scheduledAt: Date | null;
}

export function NewIdeaModal({ opened, onClose, ctx }: { opened: boolean; onClose: () => void; ctx: ModalContext }) {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const allProjects = useStore((s) => s.projects);
  const projects = allProjects.filter((p) => p.modules.includes('communication'));
  const form = useForm<Values>({
    initialValues: { projectId: 'yumco', title: '', objective: '', networks: ['instagram', 'linkedin', 'facebook'], format: 'image', scheduledAt: dayjs(nextMonday(12)).toDate() },
    validate: {
      title: (v) => (v.trim().length < 3 ? 'Sujet requis' : null),
      networks: (v) => (!v.length ? 'Choisir au moins un réseau' : null),
      format: (v, values) => (values.networks.includes('tiktok') && v !== 'video' ? 'TikTok nécessite le format vidéo' : null),
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset();
      if (ctx.projectId) form.setFieldValue('projectId', ctx.projectId);
      if (ctx.title) form.setFieldValue('title', ctx.title);
      if (ctx.date) form.setFieldValue('scheduledAt', dayjs(ctx.date).hour(12).toDate());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const submit = form.onSubmit(async (v) => {
    setSaving(true);
    const content = await api.contents.createIdea({ ...v, scheduledAt: dayjs(v.scheduledAt).toISOString() }).finally(() => setSaving(false));
    notifySuccess('Idée ajoutée', 'Elle apparaît dans le calendrier avec le statut « Idée ».');
    onClose();
    navigate(paths.content(content.projectId, content.id));
  });

  return (
    <Modal opened={opened} onClose={onClose} title={<Text fw={650}>Nouvelle idée de contenu</Text>} size="lg">
      <form onSubmit={submit}>
        <Stack>
          <Select label="Projet" allowDeselect={false} data={projects.map((p) => ({ value: p.id, label: p.name }))} {...form.getInputProps('projectId')} />
          <TextInput label="Sujet" withAsterisk data-autofocus placeholder="Ex. : les coulisses d’un service du midi" {...form.getInputProps('title')} />
          <Textarea label="Objectif" autosize minRows={2} {...form.getInputProps('objective')} />
          <Checkbox.Group label="Réseaux visés" withAsterisk {...form.getInputProps('networks')}>
            <Group mt={6}>
              {(Object.keys(networkLabel) as Network[]).map((n) => (
                <Checkbox key={n} value={n} label={networkLabel[n]} />
              ))}
            </Group>
          </Checkbox.Group>
          <Text size="xs" c="dimmed" mt={-8}>
            Instagram, LinkedIn et Facebook partagent un visuel maître décliné ; TikTok est un format vidéo distinct.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select label="Format" data={Object.entries(formatLabel).map(([value, label]) => ({ value, label }))} allowDeselect={false} {...form.getInputProps('format')} />
            <DateTimePicker label="Date souhaitée" valueFormat="D MMM YYYY · HH:mm" {...form.getInputProps('scheduledAt')} />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              Ajouter l’idée
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
