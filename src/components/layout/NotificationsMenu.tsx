import { ActionIcon, Badge, Button, Group, Indicator, Popover, ScrollArea, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconBell, IconCircleCheck, IconInfoCircle, IconUserCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api';
import { useStore } from '@/store';
import { useUnreadCount } from '@/store/selectors';
import { fromNow } from '@/core';
import { EmptyState } from '@/components/ui';

const typeIcon = {
  validation: { icon: IconUserCheck, color: 'night' },
  alert: { icon: IconAlertTriangle, color: 'red' },
  info: { icon: IconInfoCircle, color: 'blue' },
  success: { icon: IconCircleCheck, color: 'sage' },
} as const;

export function NotificationsMenu() {
  const [opened, setOpened] = useState(false);
  const notifications = useStore((s) => s.notifications);
  const unread = useUnreadCount();
  const navigate = useNavigate();

  return (
    <Popover opened={opened} onChange={setOpened} width={360} position="bottom-end" shadow="md" radius="lg">
      <Popover.Target>
        <Indicator label={unread} size={16} disabled={!unread} color="red" offset={4}>
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => setOpened((o) => !o)} aria-label="Notifications">
            <IconBell size={20} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid var(--app-border)' }}>
          <Group gap={6}>
            <Text fw={600} size="sm">
              Notifications
            </Text>
            {unread > 0 && (
              <Badge size="sm" color="red" variant="light">
                {unread} non lues
              </Badge>
            )}
          </Group>
          <Button size="compact-xs" variant="subtle" onClick={() => api.notifications.markAllRead()} disabled={!unread}>
            Tout marquer comme lu
          </Button>
        </Group>
        <ScrollArea.Autosize mah={380}>
          {notifications.length ? (
            <Stack gap={0}>
              {notifications.map((n) => {
                const { icon: Icon, color } = typeIcon[n.type];
                return (
                  <UnstyledButton
                    key={n.id}
                    p="sm"
                    onClick={() => {
                      if (!n.read) void api.notifications.markRead(n.id);
                      setOpened(false);
                      if (n.link) navigate(n.link);
                    }}
                    style={{ background: n.read ? undefined : 'var(--mantine-color-night-0)', borderBottom: '1px solid var(--app-border)' }}
                  >
                    <Group gap="sm" wrap="nowrap" align="flex-start">
                      <ThemeIcon variant="light" color={color} radius="xl" size={30}>
                        <Icon size={16} />
                      </ThemeIcon>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={n.read ? 500 : 650}>
                          {n.title}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {n.body}
                        </Text>
                        <Text size="xs" c="dimmed" mt={2}>
                          {fromNow(n.date)}
                        </Text>
                      </div>
                    </Group>
                  </UnstyledButton>
                );
              })}
            </Stack>
          ) : (
            <EmptyState compact title="Aucune notification" />
          )}
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}
