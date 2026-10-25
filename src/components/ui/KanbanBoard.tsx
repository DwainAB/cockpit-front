import { Badge, Box, Group, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

interface Props<T, K extends string> {
  columns: { key: K; label: string; hint?: string }[];
  items: T[];
  getColumn: (item: T) => K;
  getKey: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  highlightColumns?: K[];
}

/** Kanban horizontal générique (lecture seule, le clic sur une carte est géré par renderCard). */
export function KanbanBoard<T, K extends string>({ columns, items, getColumn, getKey, renderCard, highlightColumns = [] }: Props<T, K>) {
  return (
    <Box className="scroll-x" pb="sm">
      <Group align="stretch" wrap="nowrap" gap="sm" style={{ minWidth: 'max-content' }}>
        {columns.map((col) => {
          const colItems = items.filter((i) => getColumn(i) === col.key);
          const highlighted = highlightColumns.includes(col.key);
          return (
            <Stack
              key={col.key}
              w={264}
              gap="sm"
              p="sm"
              style={{
                background: highlighted ? 'var(--mantine-color-night-0)' : '#efece6',
                borderRadius: 12,
                border: highlighted ? '1px dashed var(--mantine-color-night-3)' : '1px solid transparent',
                minHeight: 420,
              }}
            >
              <Group justify="space-between" px={4} wrap="nowrap">
                <Text size="sm" fw={650} truncate>
                  {col.label}
                </Text>
                <Badge size="sm" variant={colItems.length ? 'white' : 'transparent'} color="gray" c="dark">
                  {colItems.length}
                </Badge>
              </Group>
              {highlighted && (
                <Text size="xs" c="night.7" px={4} mt={-6}>
                  Votre validation est attendue
                </Text>
              )}
              {colItems.map((i) => (
                <div key={getKey(i)}>{renderCard(i)}</div>
              ))}
              {!colItems.length && (
                <Text size="xs" c="dimmed" ta="center" py="lg">
                  Aucun dossier
                </Text>
              )}
            </Stack>
          );
        })}
      </Group>
    </Box>
  );
}
