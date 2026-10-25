import { Card, SimpleGrid, Skeleton, Stack } from '@mantine/core';

/** Squelette générique affiché pendant le chargement simulé. */
export function PageSkeleton({ cards = 4, rows = 5 }: { cards?: number; rows?: number }) {
  return (
    <Stack gap="lg">
      <Skeleton h={28} w={260} radius="md" />
      <SimpleGrid cols={{ base: 1, sm: 2, lg: cards }}>
        {Array.from({ length: cards }).map((_, i) => (
          <Card key={i} padding="md">
            <Skeleton h={12} w="50%" mb="sm" />
            <Skeleton h={28} w="40%" />
          </Card>
        ))}
      </SimpleGrid>
      <Card>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} h={18} mb="md" />
        ))}
      </Card>
    </Stack>
  );
}
