import { ActionIcon, Autocomplete, Badge, Button, Card, Chip, Drawer, Group, Select, SimpleGrid, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertTriangle, IconBrain, IconMessageCircle, IconPencil, IconPlus, IconSettings, IconTrash } from '@tabler/icons-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  defaultModels,
  MODEL_SUGGESTIONS,
  PROVIDER_LABELS,
  sameModels,
  SITE_TASKS,
  SPECIALTIES,
  specialtyOf,
  fromNow,
  MEMORY_MAX_LENGTH,
  type Agent,
  type AgentInput,
  type AgentMemoryEntry,
  type AgentKind,
  type AgentModel,
  type AgentModels,
  type AgentProvider,
} from '@/core';
import { api } from '@/api';
import { AgentAvatar, PageHeader } from '@/components/ui';
import { useOpenConversation } from '@/hooks/useOpenConversation';
import { notifySuccess } from '@/lib/notify';
import { useStore } from '@/store';
import { useAgentIssues, useProjectsMap } from '@/store/selectors';

const specialtyOptions = Object.values(SPECIALTIES).map((s) => ({ value: s.id, label: s.label }));
const providerOptions = Object.entries(PROVIDER_LABELS).map(([value, label]) => ({ value, label }));
const modelUses = [
  { key: 'task', label: 'Tâches', description: 'Maquettes, code et livrables.' },
  { key: 'chat', label: 'Conversations', description: 'Discussions et réunions : un modèle moins cher suffit souvent.' },
] as const;

const emptyAgent: AgentInput = {
  name: '',
  kind: 'communication',
  instructions: SPECIALTIES.communication.defaultInstructions,
  projectIds: [],
  models: defaultModels('communication'),
};

const toInput = (a: Agent): AgentInput => ({
  name: a.name,
  kind: a.kind,
  instructions: a.instructions,
  projectIds: a.projectIds,
  models: { task: { ...a.models.task }, chat: { ...a.models.chat } },
});

/** Configuration des agents : spécialité, prompt, projets, modèles et mémoire. */
export default function AgentsPage() {
  const agents = useStore((s) => s.agents);
  const siteAgents = useStore((s) => s.settings.siteAgents);
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
        description="Chaque spécialité définit le modèle utilisé. Configurez le prompt, les projets et la mémoire de chaque agent."
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
            <Card key={a.id}>
              <Stack gap="sm" h="100%">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <AgentAvatar agent={a} size={44} withStatus />
                    <div>
                      <Text fw={650}>{a.name}</Text>
                      <Text size="sm" c="dimmed">
                        {specialtyOf(a.kind).label}
                      </Text>
                    </div>
                  </Group>
                </Group>
                <Text size="sm" lineClamp={2}>
                  {a.instructions || specialtyOf(a.kind).description}
                </Text>
                <Text size="xs" c="dimmed">
                  Tâches : {a.models.task.model} · Conversations : {a.models.chat.model}
                </Text>
                <Group gap={6}>
                  {SITE_TASKS.filter((t) => siteAgents?.[t.key] === a.id).map((t) => (
                    <Badge key={t.key} size="xs" variant="filled" color="grape" tt="none">
                      {t.label}
                    </Badge>
                  ))}
                  {a.memories.length > 0 && (
                    <Badge size="xs" variant="dot" color="gray">
                      {a.memories.length} souvenir{a.memories.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </Group>
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
      models: {
        task: { model: (v) => (!v.trim() ? 'Modèle requis' : null) },
        chat: { model: (v) => (!v.trim() ? 'Modèle requis' : null) },
      },
    },
  });

  const specialty = specialtyOf(form.values.kind);

  /** Conserve un prompt personnalisé ; sinon, propose celui de la nouvelle spécialité. */
  const changeSpecialty = (kind: string | null) => {
    if (!kind) return;
    const next = specialtyOf(kind as AgentKind);
    const prev = specialtyOf(form.values.kind);
    form.setValues((v) => ({
      ...v,
      kind: kind as AgentKind,
      instructions: !v.instructions || v.instructions === prev.defaultInstructions ? next.defaultInstructions : v.instructions,
      // Des modèles personnalisés sont conservés ; ceux restés par défaut suivent la nouvelle spécialité.
      models: !v.models || sameModels(v.models, defaultModels(prev.id)) ? defaultModels(next.id) : v.models,
    }));
  };

  useEffect(() => {
    if (!opened) return;
    form.setValues(agent ? toInput(agent) : { ...emptyAgent, models: defaultModels(emptyAgent.kind) });
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
            <Select
              label="Spécialité"
              allowDeselect={false}
              data={specialtyOptions}
              value={form.values.kind}
              onChange={changeSpecialty}
            />
          </Group>
          <Textarea
            label="Prompt"
            description="Son rôle et ses consignes : « Tu es le CTO de l’équipe tech. Ton rôle est de … »"
            placeholder="Tu es le CTO de l'équipe tech. Ton rôle est de …"
            autosize
            minRows={5}
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
          <ModelsFields
            models={form.values.models ?? defaultModels(form.values.kind)}
            defaults={defaultModels(form.values.kind)}
            specialtyLabel={specialty.label}
            errors={{ task: form.errors['models.task.model'], chat: form.errors['models.chat.model'] }}
            onChange={(models) => form.setFieldValue('models', models)}
          />
          {!isNew && agent && <MemoryPanel agent={agent} />}
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

/** Modèles d'un agent : un pour les tâches, un pour les conversations ; par défaut ceux de la spécialité. */
function ModelsFields({
  models,
  defaults,
  specialtyLabel,
  errors,
  onChange,
}: {
  models: AgentModels;
  defaults: AgentModels;
  specialtyLabel: string;
  errors: Partial<Record<keyof AgentModels, ReactNode>>;
  onChange: (models: AgentModels) => void;
}) {
  const set = (key: keyof AgentModels, patch: Partial<AgentModel>) => onChange({ ...models, [key]: { ...models[key], ...patch } });
  const isDefault = sameModels(models, defaults);
  return (
    <Stack gap="xs" p="sm" style={{ background: 'var(--app-surface-2)', borderRadius: 10 }}>
      <Group justify="space-between">
        <Text fw={550}>Modèles d’IA</Text>
        {isDefault ? (
          <Text size="xs" c="dimmed">
            Valeurs de la spécialité {specialtyLabel}
          </Text>
        ) : (
          <Button size="compact-xs" variant="subtle" onClick={() => onChange(defaults)}>
            Revenir aux valeurs de la spécialité
          </Button>
        )}
      </Group>
      {modelUses.map((use) => (
        <Group key={use.key} grow align="flex-start">
          <Select
            label={use.label}
            description={use.description}
            allowDeselect={false}
            data={providerOptions}
            value={models[use.key].provider}
            onChange={(v) => {
              if (!v) return;
              const provider = v as AgentProvider;
              set(use.key, { provider, model: MODEL_SUGGESTIONS[provider][0] ?? '' });
            }}
          />
          <Autocomplete
            label="Modèle"
            description="Identifiant chez le fournisseur."
            data={MODEL_SUGGESTIONS[models[use.key].provider]}
            value={models[use.key].model}
            onChange={(model) => set(use.key, { model })}
            error={errors[use.key]}
          />
        </Group>
      ))}
    </Stack>
  );
}

const memorySources: Record<AgentMemoryEntry['source'], string> = {
  manual: 'Ajouté à la main',
  conversation: 'Retenu en discussion',
  meeting: 'Retenu en réunion',
  project: 'Remarque de modification',
};

/** Mémoire de l'agent : toujours active. Les souvenirs pertinents sont ajoutés à son prompt (6 au plus par appel). */
function MemoryPanel({ agent }: { agent: Agent }) {
  const projects = useProjectsMap();
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

  const add = async () => {
    setAdding(true);
    try {
      await api.agents.memories.add(agent.id, { text: text.trim() });
      setText('');
    } finally {
      setAdding(false);
    }
  };
  const save = async () => {
    if (!editing?.text.trim()) return;
    await api.agents.memories.update(agent.id, editing.id, { text: editing.text.trim() });
    setEditing(null);
  };

  return (
    <Stack gap="xs" p="sm" style={{ background: 'var(--app-surface-2)', borderRadius: 10 }}>
      <Group gap="xs">
        <IconBrain size={16} />
        <Text fw={550}>Mémoire ({agent.memories.length})</Text>
      </Group>
      <Text size="xs" c="dimmed">
        L’agent retient seul vos remarques de modification et les décisions prises en discussion, rattachées à leur projet. Sur un projet, il n’utilise que les souvenirs de ce projet et ceux valables partout (ajoutés à la main).
      </Text>
      {agent.memories.length === 0 && (
        <Text size="xs" c="dimmed">
          Aucun souvenir pour l’instant.
        </Text>
      )}
      {agent.memories.map((m) =>
        editing?.id === m.id ? (
          <Stack key={m.id} gap={6}>
            <Textarea autosize minRows={2} maxLength={MEMORY_MAX_LENGTH} value={editing.text} onChange={(e) => setEditing({ id: m.id, text: e.currentTarget.value })} />
            <Group gap="xs" justify="flex-end">
              <Button size="compact-xs" variant="default" onClick={() => setEditing(null)}>
                Annuler
              </Button>
              <Button size="compact-xs" disabled={!editing.text.trim()} onClick={() => void save()}>
                Enregistrer
              </Button>
            </Group>
          </Stack>
        ) : (
          <Group key={m.id} justify="space-between" align="flex-start" wrap="nowrap" p="xs" style={{ background: 'var(--app-surface)', borderRadius: 8 }}>
            <div>
              <Text size="sm">{m.text}</Text>
              <Text size="xs" c="dimmed">
                {memorySources[m.source]} · {m.projectId ? (projects[m.projectId]?.name ?? m.projectId) : 'Tous les projets'} · {fromNow(m.createdAt)}
              </Text>
            </div>
            <Group gap={2} wrap="nowrap">
              <ActionIcon variant="subtle" color="gray" aria-label="Modifier le souvenir" onClick={() => setEditing({ id: m.id, text: m.text })}>
                <IconPencil size={14} />
              </ActionIcon>
              <ActionIcon variant="subtle" color="red" aria-label="Supprimer le souvenir" onClick={() => void api.agents.memories.remove(agent.id, m.id)}>
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          </Group>
        ),
      )}
      <Group align="flex-end" gap="xs" wrap="nowrap">
        <Textarea
          style={{ flex: 1 }}
          placeholder="Ajouter un souvenir : « Le client préfère les tons crème. »"
          autosize
          minRows={1}
          maxLength={MEMORY_MAX_LENGTH}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
        />
        <ActionIcon size="lg" variant="light" aria-label="Ajouter le souvenir" loading={adding} disabled={!text.trim()} onClick={() => void add()}>
          <IconPlus size={16} />
        </ActionIcon>
      </Group>
    </Stack>
  );
}
