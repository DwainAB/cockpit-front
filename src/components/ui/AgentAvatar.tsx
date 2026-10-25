import { Avatar, Group, Indicator, Text, Tooltip, type AvatarProps } from '@mantine/core';
import { IconChartPie, IconCode, IconHierarchy2, IconPalette, IconSpeakerphone, IconUser } from '@tabler/icons-react';
import type { Agent, AgentKind } from '@/core';
import { useAgent } from '@/store/selectors';

export const agentIcon: Record<AgentKind, typeof IconCode> = {
  developer: IconCode,
  webdesign: IconPalette,
  communication: IconSpeakerphone,
  finance: IconChartPie,
  coordinator: IconHierarchy2,
};

const dotColor = { available: 'sage.5', busy: 'orange.5', offline: 'gray.4' } as const;

interface Props extends Omit<AvatarProps, 'src'> {
  agent?: Agent;
  withStatus?: boolean;
}

export function AgentAvatar({ agent, withStatus, size = 32, ...rest }: Props) {
  if (!agent)
    return (
      <Avatar size={size} radius="xl" color="night" {...rest}>
        <IconUser size={16} />
      </Avatar>
    );
  const Icon = agentIcon[agent.kind];
  const px = typeof size === 'number' ? size : 32;
  const avatar = (
    <Avatar size={size} radius="xl" styles={{ placeholder: { background: `${agent.color}1f`, color: agent.color } }} {...rest}>
      <Icon size={Math.round(px * 0.5)} stroke={1.8} />
    </Avatar>
  );
  return withStatus ? (
    <Indicator color={dotColor[agent.availability]} offset={4} size={10} withBorder position="bottom-end">
      {avatar}
    </Indicator>
  ) : (
    avatar
  );
}

/** Puce agent compacte (avatar + nom). Accepte un id. */
export function AgentChip({ agentId, showRole, size = 'sm' }: { agentId: string; showRole?: boolean; size?: 'xs' | 'sm' }) {
  const agent = useAgent(agentId);
  if (agentId === 'me')
    return (
      <Text size={size} fw={500}>
        Moi
      </Text>
    );
  if (!agent) return null;
  return (
    <Tooltip label={agent.role}>
      <Group gap={6} wrap="nowrap">
        <AgentAvatar agent={agent} size={size === 'xs' ? 20 : 24} />
        <div style={{ lineHeight: 1.15 }}>
          <Text size={size} fw={500}>
            {agent.name}
          </Text>
          {showRole && (
            <Text size="xs" c="dimmed">
              {agent.role}
            </Text>
          )}
        </div>
      </Group>
    </Tooltip>
  );
}

export function AgentStack({ agentIds, max = 4 }: { agentIds: string[]; max?: number }) {
  return (
    <Avatar.Group spacing={8}>
      {agentIds.slice(0, max).map((id) => (
        <AgentStackItem key={id} id={id} />
      ))}
      {agentIds.length > max && <Avatar size={28} radius="xl">+{agentIds.length - max}</Avatar>}
    </Avatar.Group>
  );
}

function AgentStackItem({ id }: { id: string }) {
  const agent = useAgent(id);
  return (
    <Tooltip label={agent ? `${agent.name} · ${agent.role}` : id}>
      <AgentAvatar agent={agent} size={28} style={{ border: '2px solid white' }} />
    </Tooltip>
  );
}
