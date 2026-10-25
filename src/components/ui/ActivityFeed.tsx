import { Group, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconBuildingStore, IconCalendarEvent, IconCheck, IconCircleCheck, IconListCheck, IconSend } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { type Activity, type ActivityType, fromNow } from '@/core';
import { useAgentsMap } from '@/store/selectors';
import { EmptyState } from './EmptyState';

const icons: Record<ActivityType, { icon: typeof IconCheck; color: string }> = {
  agent_done: { icon: IconCircleCheck, color: 'sage' },
  restaurant_created: { icon: IconBuildingStore, color: 'night' },
  submitted: { icon: IconSend, color: 'blue' },
  issue: { icon: IconAlertTriangle, color: 'red' },
  validated: { icon: IconCheck, color: 'sage' },
  meeting: { icon: IconCalendarEvent, color: 'grape' },
  task: { icon: IconListCheck, color: 'gray' },
};

export function ActivityFeed({ items, limit }: { items: Activity[]; limit?: number }) {
  const agents = useAgentsMap();
  const navigate = useNavigate();
  const list = limit ? items.slice(0, limit) : items;
  if (!list.length) return <EmptyState compact title="Aucune activité" description="Les actions des agents apparaîtront ici." />;
  return (
    <Stack gap={4}>
      {list.map((a) => {
        const { icon: Icon, color } = icons[a.type];
        const who = a.actor === 'me' ? 'Vous' : a.actor === 'system' ? '' : agents[a.actor]?.name;
        return (
          <UnstyledButton
            key={a.id}
            onClick={() => a.link && navigate(a.link)}
            p={8}
            style={{ borderRadius: 8 }}
            className="hover-lift"
          >
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon variant="light" color={color} radius="xl" size={28}>
                <Icon size={15} />
              </ThemeIcon>
              <div style={{ minWidth: 0 }}>
                <Text size="sm" lh={1.35}>
                  {who && <b>{who} </b>}
                  {a.text}
                </Text>
                <Text size="xs" c="dimmed">
                  {fromNow(a.date)}
                </Text>
              </div>
            </Group>
          </UnstyledButton>
        );
      })}
    </Stack>
  );
}
