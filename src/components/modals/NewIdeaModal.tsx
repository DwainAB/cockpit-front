import { Button, Checkbox, Group, Modal, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api';
import { type ContentFormat, dayjs, editorialPlanOf, type Network, networkLabel, nextMonday, paths, POST_NETWORKS } from '@/core';
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
  const form = useForm<Values>({
    initialValues: { projectId: 'yumco', title: '', objective: '', networks: ['instagram', 'linkedin', 'facebook'], format: 'image', scheduledAt: dayjs(nextMonday(12)).toDate() },
    validate: {
      title: (v) => (v.trim().length < 3 ? 'Sujet requis' : null),
      networks: (v) => (!v.length ? 'Choisir au moins un réseau' : null),
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset();
      if (ctx.projectId) form.setFieldValue('projectId', ctx.projectId);
      if (ctx.title) form.setFieldValue('title', ctx.title);
      // Réseaux et heure du planning des posts du projet.
      const project = allProjects.find((p) => p.id === (ctx.projectId ?? 'yumco'));
      const plan = project && editorialPlanOf(project);
      if (plan) form.setFieldValue('networks', plan.networks);
      if (ctx.date) {
        const [h, m] = (plan?.time ?? '12:00').split(':').map(Number);
        form.setFieldValue('scheduledAt', dayjs(ctx.date).hour(h).minute(m).toDate());
      }
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
          <TextInput label="Sujet" withAsterisk data-autofocus placeholder="Ex. : les coulisses d’un service du midi" {...form.getInputProps('title')} />
          <Textarea label="Objectif" autosize minRows={2} {...form.getInputProps('objective')} />
          <Checkbox.Group label="Réseaux visés" withAsterisk {...form.getInputProps('networks')}>
            <Group mt={6}>
              {POST_NETWORKS.map((n) => (
                <Checkbox key={n} value={n} label={networkLabel[n]} />
              ))}
            </Group>
          </Checkbox.Group>
          <Text size="xs" c="dimmed" mt={-8}>
            Texte adapté à chaque réseau + une image créée par l’agent. TikTok (vidéo) arrivera plus tard.
          </Text>
          <DateTimePicker label="Date de publication" valueFormat="dddd D MMMM YYYY · HH:mm" {...form.getInputProps('scheduledAt')} />
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
