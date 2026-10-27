import { Group, Select, Stack, Text, Tooltip } from '@mantine/core';
import { DEFAULT_SITE_AGENTS, PROVIDER_LABELS, SITE_TASKS, specialtyLabel, type SiteTask } from '@/core';
import { api } from '@/api';
import { AgentAvatar } from '@/components/ui';
import { notifySuccess } from '@/lib/notify';
import { useStore } from '@/store';

/**
 * Choix de l'agent qui réalise chaque tâche IA du flux de création de site (avec son modèle « Tâches »).
 * `compact` : une ligne par tâche, pour l'en-tête de la page de production.
 */
export function SiteAgentsFields({ compact = false }: { compact?: boolean }) {
  const agents = useStore((s) => s.agents);
  const siteAgents = useStore((s) => s.settings.siteAgents) ?? DEFAULT_SITE_AGENTS;
  const options = agents.map((a) => ({ value: a.id, label: `${a.name} — ${specialtyLabel(a.kind)}` }));

  const assign = async (task: SiteTask, agentId: string | null) => {
    if (!agentId || agentId === siteAgents[task]) return;
    await api.settings.update({ siteAgents: { ...siteAgents, [task]: agentId } });
    notifySuccess('Agent attribué', `${agents.find((a) => a.id === agentId)?.name} réalisera désormais : ${SITE_TASKS.find((t) => t.key === task)?.label.toLowerCase()}.`);
  };

  return (
    <Group align="flex-start" gap={compact ? 'lg' : 'xl'} grow={!compact} wrap="wrap">
      {SITE_TASKS.map((task) => {
        const agent = agents.find((a) => a.id === siteAgents[task.key]);
        const modelLine = agent && `${agent.models.task.model} (${PROVIDER_LABELS[agent.models.task.provider]})`;
        return (
          <Stack key={task.key} gap={6} miw={compact ? 240 : undefined} style={{ flex: compact ? '1 1 240px' : undefined }}>
            <Select
              label={task.label}
              description={compact ? undefined : task.description}
              size={compact ? 'xs' : 'sm'}
              allowDeselect={false}
              data={options}
              value={siteAgents[task.key]}
              onChange={(v) => void assign(task.key, v)}
              leftSection={agent && <AgentAvatar agent={agent} size={compact ? 18 : 22} />}
            />
            {modelLine && (
              <Tooltip label="Modèle « Tâches » de l’agent, réglable sur la page Agents" disabled={!compact}>
                <Text size="xs" c="dimmed" truncate>
                  Modèle : {modelLine}
                </Text>
              </Tooltip>
            )}
          </Stack>
        );
      })}
    </Group>
  );
}
