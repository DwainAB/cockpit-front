import { Card, Group, Text, type CardProps } from '@mantine/core';
import type { ReactNode } from 'react';

interface Props extends Omit<CardProps, 'title'> {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}

/** Carte de section avec en-tête homogène. */
export function SectionCard({ title, icon, action, subtitle, children, ...rest }: Props) {
  return (
    <Card {...rest}>
      <Group justify="space-between" mb="md" wrap="nowrap" gap="sm">
        <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
          {icon && <Text c="night.6" display="flex">{icon}</Text>}
          <div style={{ minWidth: 0 }}>
            <Text fw={650} size="md" truncate>
              {title}
            </Text>
            {subtitle && (
              <Text size="xs" c="dimmed">
                {subtitle}
              </Text>
            )}
          </div>
        </Group>
        {action}
      </Group>
      {children}
    </Card>
  );
}
