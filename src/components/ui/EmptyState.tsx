import { Stack, Text, ThemeIcon } from '@mantine/core';
import { IconMoodEmpty } from '@tabler/icons-react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ title, description, icon, action, compact }: Props) {
  return (
    <Stack align="center" gap={6} py={compact ? 'md' : 40} px="md" ta="center">
      <ThemeIcon variant="light" color="gray" size={compact ? 36 : 48} radius="xl">
        {icon ?? <IconMoodEmpty size={compact ? 18 : 24} />}
      </ThemeIcon>
      <Text fw={600} size={compact ? 'sm' : 'md'} mt={4}>
        {title}
      </Text>
      {description && (
        <Text size="sm" c="dimmed" maw={380}>
          {description}
        </Text>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </Stack>
  );
}
