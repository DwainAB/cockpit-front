import { Card, Group, Text, ThemeIcon } from '@mantine/core';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: ReactNode;
  to?: string;
  tone?: 'night' | 'sage' | 'orange' | 'red' | 'blue';
  highlight?: boolean;
}

export function StatCard({ label, value, icon, hint, to, tone = 'night', highlight }: Props) {
  const content = (
    <Card className={to ? 'hover-lift' : undefined} padding="md" h="100%" style={highlight ? { borderColor: 'var(--mantine-color-red-3)' } : undefined}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.04em' }}>
          {label}
        </Text>
        <ThemeIcon variant="light" color={tone} size={30} radius="md">
          {icon}
        </ThemeIcon>
      </Group>
      <Text fz={30} fw={700} mt={6} lh={1.1} style={{ letterSpacing: '-0.02em' }}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed" mt={6}>
          {hint}
        </Text>
      )}
    </Card>
  );
  return to ? (
    <Link to={to} style={{ textDecoration: 'none' }}>
      {content}
    </Link>
  ) : (
    content
  );
}
