import { Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useOpenConversation } from '@/hooks/useOpenConversation';
import { specialtyLabel } from '@/core';
import { useStore } from '@/store';
import type { ModalContext } from '@/store/ui';

/** Discussion en tête-à-tête avec un agent, sur un projet. */
export function NewConversationModal({ opened, onClose, ctx }: { opened: boolean; onClose: () => void; ctx: ModalContext }) {
  const projects = useStore((s) => s.projects);
  const agents = useStore((s) => s.agents);
  const openConversation = useOpenConversation();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setAgentId(ctx.agentIds?.[0] ?? null);
    setProjectId(ctx.projectId ?? null);
  }, [opened, ctx]);

  const agent = agents.find((a) => a.id === agentId);
  const projectOptions = projects.filter((p) => !agent || agent.projectIds.includes(p.id));

  return (
    <Modal opened={opened} onClose={onClose} title={<Text fw={650}>Nouvelle discussion</Text>}>
      <Stack>
        <Select
          label="Agent"
          placeholder="Choisir un agent"
          data={agents.filter((a) => !ctx.projectId || a.projectIds.includes(ctx.projectId)).map((a) => ({ value: a.id, label: `${a.name} — ${specialtyLabel(a.kind)}` }))}
          value={agentId}
          onChange={(v) => {
            setAgentId(v);
            const next = agents.find((a) => a.id === v);
            if (next && projectId && !next.projectIds.includes(projectId) && !ctx.projectId) setProjectId(null);
          }}
        />
        {/* Ouverte depuis un projet : la discussion le concerne, sans choix à faire. */}
        {!ctx.projectId && (
          <Select label="Projet" placeholder="Choisir un projet" data={projectOptions.map((p) => ({ value: p.id, label: p.name }))} value={projectId} onChange={setProjectId} />
        )}
        <Text size="xs" c="dimmed">
          Si une discussion existe déjà avec cet agent sur ce projet, elle est simplement rouverte.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={!agentId || !projectId}
            loading={saving}
            onClick={async () => {
              setSaving(true);
              await openConversation(agentId!, projectId!).finally(() => setSaving(false));
              onClose();
            }}
          >
            Ouvrir la discussion
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
