import { Group, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

interface Props {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}

export function PageHeader({ title, description, actions, eyebrow }: Props) {
  return (
    <Group justify="space-between" align="flex-end" mb="lg" gap="md" wrap="wrap">
      <Stack gap={4} style={{ minWidth: 0, flex: '1 1 320px' }}>
        {eyebrow}
        <Title order={2} fz={{ base: 22, sm: 26 }} style={{ letterSpacing: '-0.01em' }}>
          {title}
        </Title>
        {description && (
          <Text c="dimmed" size="sm" maw={720}>
            {description}
          </Text>
        )}
      </Stack>
      {actions && <Group gap="sm">{actions}</Group>}
    </Group>
  );
}
