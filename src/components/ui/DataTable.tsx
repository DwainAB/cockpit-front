import { Card, Group, Table, Text, UnstyledButton } from '@mantine/core';
import { IconArrowsSort, IconSortAscending, IconSortDescending } from '@tabler/icons-react';
import { useMemo, useState, type ReactNode } from 'react';
import type { MantineBreakpoint } from '@mantine/core';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Si fourni, la colonne devient triable. */
  sortValue?: (row: T) => string | number;
  width?: number | string;
  /** Masque la colonne sous ce point de rupture. */
  visibleFrom?: MantineBreakpoint;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  minWidth?: number;
}

/** Tableau générique triable, utilisé pour restaurants, tâches, réunions… */
export function DataTable<T>({ rows, columns, rowKey, onRowClick, empty, defaultSort, minWidth = 760 }: Props<T>) {
  const [sort, setSort] = useState(defaultSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'fr');
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const toggle = (key: string) =>
    setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));

  return (
    <Card padding={0}>
      <Table.ScrollContainer minWidth={minWidth}>
        <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover={!!onRowClick}>
          <Table.Thead bg="var(--app-surface-2)">
            <Table.Tr>
              {columns.map((c) => (
                <Table.Th key={c.key} w={c.width} visibleFrom={c.visibleFrom}>
                  {c.sortValue ? (
                    <UnstyledButton onClick={() => toggle(c.key)}>
                      <Group gap={4} wrap="nowrap">
                        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                          {c.header}
                        </Text>
                        {sort?.key === c.key ? (
                          sort.dir === 'asc' ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />
                        ) : (
                          <IconArrowsSort size={13} opacity={0.4} />
                        )}
                      </Group>
                    </UnstyledButton>
                  ) : (
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                      {c.header}
                    </Text>
                  )}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sorted.map((row) => (
              <Table.Tr key={rowKey(row)} onClick={() => onRowClick?.(row)} className={onRowClick ? 'clickable' : undefined}>
                {columns.map((c) => (
                  <Table.Td key={c.key} visibleFrom={c.visibleFrom}>
                    {c.render(row)}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {!sorted.length && empty}
    </Card>
  );
}
