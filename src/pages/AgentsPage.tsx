import { Badge, Button, Card, Chip, Drawer, Group, Select, SimpleGrid, Stack, Switch, Text, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertTriangle, IconMessageCircle, IconPlus, IconSettings } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Agent, AgentInput, AgentKind } from '@/core';
import { api } from '@/api';
import { AgentAvatar, PageHeader } from '@/components/ui';
import { useOpenConversation } from '@/hooks/useOpenConversation';
import { notifySuccess } from '@/lib/notify';
import { useStore } from '@/store';
import { useAgentIssues, useProjectsMap } from '@/store/selectors';

const kindLabels: Record<AgentKind, string> = {
  coordinator: 'Coordination',
  webdesign: 'Webdesign',
  developer: 'Développement',
  communication: 'Communication',
  finance: 'Finance',
};

const emptyAgent: AgentInput = {
  name: '',
  kind: 'communication',
  role: '',
  specialty: '',
  instructions: '',
  projectIds: [],
  enabled: true,
  permissions: { createTasks: true, requireValidation: true },
};

const toInput = (a: Agent): AgentInput => ({
  name: a.name,
  kind: a.kind,
  role: a.role,
  specialty: a.specialty,
  instructions: a.instructions,
  projectIds: a.projectIds,
  enabled: a.enabled,
  permissions: a.permissions,
});

/** Configuration des agents : rôle, instructions, projets, permissions. */
export default function AgentsPage() {
  const agents = useStore((s) => s.agents);
  const projects = useProjectsMap();
  const issues = useAgentIssues();
  const openConversation = useOpenConversation();
  const [params, setParams] = useSearchParams();
  const editing = params.get('agent');

  const open = (id: string) => setParams({ agent: id });
  const close = () => setParams({});

  return (
    <>
      <PageHeader
        title="Agents"
        description="Configurez vos agents : ce qu’ils font, sur quels projets et avec quelles permissions. Aucun modèle d’IA n’est encore connecté."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => open('new')}>
            Nouvel agent
          </Button>
        }
      />
      <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
        {agents.map((a) => {
          const agentIssues = issues[a.id] ?? [];
          return (
            <Card key={a.id} style={{ opacity: a.enabled ? 1 : 0.65 }}>
              <Stack gap="sm" h="100%">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <AgentAvatar agent={a} size={44} withStatus />
                    <div>
                      <Text fw={650}>{a.name}</Text>
                      <Text size="sm" c="dimmed">
                        {a.role}
                      </Text>
                    </div>
                  </Group>
                  <Badge variant="light" color={a.enabled ? 'sage' : 'gray'}>
                    {a.enabled ? 'Actif' : 'Désactivé'}
                  </Badge>
                </Group>
                <Text size="sm" lineClamp={2}>
                  {a.specialty}
                </Text>
                <Group gap={6}>
                  {a.projectIds.map((p) => (
                    <Badge key={p} variant="dot" color={projects[p]?.color} tt="none">
                      {projects[p]?.name}
                    </Badge>
                  ))}
                  {!a.projectIds.length && (
                    <Text size="xs" c="dimmed">
                      Aucun projet
                    </Text>
                  )}
                </Group>
                {agentIssues.length > 0 && (
                  <Group gap={6} wrap="nowrap" align="flex-start">
                    <IconAlertTriangle size={14} color="var(--mantine-color-red-7)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <Text size="xs" c="red.8" component={Link} to={agentIssues[0].link}>
                      {agentIssues[0].text}
                      {agentIssues.length > 1 && ` (+${agentIssues.length - 1})`}
                    </Text>
                  </Group>
                )}
                <Group gap="xs" mt="auto" pt="xs">
                  <Button size="xs" variant="light" leftSection={<IconSettings size={14} />} onClick={() => open(a.id)} style={{ flex: 1 }}>
                    Configurer
                  </Button>
                  <Button
                    size="xs"
                    variant="default"
                    leftSection={<IconMessageCircle size={14} />}
                    disabled={!a.projectIds.length}
                    onClick={() => openConversation(a.id, a.projectIds[0])}
                    style={{ flex: 1 }}
                  >
                    Discuter
                  </Button>
                </Group>
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>
      <AgentDrawer agentId={editing} onClose={close} />
    </>
  );
}

function AgentDrawer({ agentId, onClose }: { agentId: string | null; onClose: () => void }) {
  const agent = useStore((s) => s.agents.find((a) => a.id === agentId));
  const projects = useStore((s) => s.projects);
  const isNew = agentId === 'new';
  const opened = isNew || !!agent;
  const [saving, setSaving] = useState(false);

  const form = useForm<AgentInput>({
    initialValues: emptyAgent,
    validate: {
      name: (v) => (!v.trim() ? 'Nom requis' : null),
      role: (v) => (!v.trim() ? 'Rôle requis' : null),
      specialty: (v) => (!v.trim() ? 'Décrivez la spécialité' : null),
    },
  });

  useEffect(() => {
    if (!opened) return;
    form.setValues(agent ? toInput(agent) : emptyAgent);
    form.resetDirty();
    // Le formulaire est réinitialisé uniquement à l'ouverture ou au changement d'agent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, opened]);

  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    try {
      if (isNew) await api.agents.create(values);
      else await api.agents.update(agentId!, values);
    } finally {
      setSaving(false);
    }
    notifySuccess(isNew ? 'Agent créé' : 'Configuration enregistrée', values.name);
    onClose();
  });

  return (
    <Drawer opened={opened} onClose={onClose} position="right" size="md" title={<Text fw={650}>{isNew ? 'Nouvel agent' : `Configurer ${agent?.name ?? ''}`}</Text>}>
      <form onSubmit={submit}>
        <Stack>
          <Group grow align="flex-start">
            <TextInput label="Nom" withAsterisk {...form.getInputProps('name')} />
            <Select label="Type" allowDeselect={false} data={Object.entries(kindLabels).map(([value, label]) => ({ value, label }))} {...form.getInputProps('kind')} />
          </Group>
          <TextInput label="Rôle" placeholder="Ex. : Agent communication" withAsterisk {...form.getInputProps('role')} />
          <Textarea label="Spécialité" autosize minRows={2} withAsterisk {...form.getInputProps('specialty')} />
          <Textarea
            label="Instructions"
            description="Consignes permanentes que l’agent suivra une fois un modèle connecté."
            autosize
            minRows={4}
            {...form.getInputProps('instructions')}
          />
          <div>
            <Text size="sm" fw={500} mb={6}>
              Projets
            </Text>
            <Chip.Group multiple value={form.values.projectIds} onChange={(v) => form.setFieldValue('projectIds', v)}>
              <Group gap="xs">
                {projects.map((p) => (
                  <Chip key={p.id} value={p.id} variant="light" size="sm">
                    {p.name}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </div>
          <Stack gap="xs" p="sm" style={{ background: 'var(--app-surface-2)', borderRadius: 10 }}>
            <Switch label="Agent actif" description="Désactivé, il ne répond plus aux discussions ni aux réunions." {...form.getInputProps('enabled', { type: 'checkbox' })} />
            <Switch label="Peut créer des tâches" {...form.getInputProps('permissions.createTasks', { type: 'checkbox' })} />
            <Switch label="Soumet chaque livrable à ma validation" {...form.getInputProps('permissions.requireValidation', { type: 'checkbox' })} />
          </Stack>
          <Select label="Modèle d’IA" data={['Non connecté']} value="Non connecté" disabled description="Le branchement d’un modèle viendra dans une prochaine version." />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              {isNew ? 'Créer l’agent' : 'Enregistrer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  );
}
