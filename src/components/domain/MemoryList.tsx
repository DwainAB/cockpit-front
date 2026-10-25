import { Badge, Group, Text, Timeline } from '@mantine/core';
import { IconCalendarEvent, IconPencil, IconRobot } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { fmtDate, type MemoryNote, paths } from '@/core';
import { EmptyState } from '@/components/ui';

const source = {
  meeting: { label: 'Réunion', color: 'grape', icon: IconCalendarEvent },
  manual: { label: 'Note manuelle', color: 'gray', icon: IconPencil },
  agent: { label: 'Agent', color: 'blue', icon: IconRobot },
} as const;

/** Notes de mémoire (projet ou restaurant) avec leur provenance. */
export function MemoryList({ notes }: { notes: MemoryNote[] }) {
  if (!notes.length) return <EmptyState compact title="Mémoire vide" description="Les décisions de réunion et vos notes apparaîtront ici." />;
  return (
    <Timeline bulletSize={22} lineWidth={2} color="night">
      {notes.map((n) => {
        const s = source[n.source];
        const Icon = s.icon;
        return (
          <Timeline.Item key={n.id} bullet={<Icon size={12} />}>
            <Text size="sm">{n.text}</Text>
            <Group gap={6} mt={4}>
              <Badge size="xs" variant="light" color={s.color} tt="none">
                {s.label}
              </Badge>
              <Text size="xs" c="dimmed">
                {fmtDate(n.date)}
              </Text>
              {n.source === 'meeting' && n.sourceId && (
                <Text size="xs" component={Link} to={paths.discussions(n.sourceId)} c="night.6">
                  Voir la réunion
                </Text>
              )}
            </Group>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}

