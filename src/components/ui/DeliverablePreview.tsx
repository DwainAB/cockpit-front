import { Box, Group, Stack, Text } from '@mantine/core';
import { IconCode, IconFileDescription, IconForms, IconLayoutDashboard, IconPhoto } from '@tabler/icons-react';
import type { WorkflowStep } from '@/core';

/** Aperçu factice d'un livrable (maquette filaire, visuel, rapport…). */
export function DeliverablePreview({ deliverable, accent }: { deliverable: NonNullable<WorkflowStep['deliverable']>; accent: string }) {
  const icon = { mockup: IconLayoutDashboard, visual: IconPhoto, build: IconCode, report: IconFileDescription, form: IconForms }[deliverable.kind];
  const Icon = icon;
  return (
    <Group gap="md" wrap="nowrap" align="stretch">
      <Box
        w={150}
        h={96}
        style={{ borderRadius: 8, border: '1px solid var(--app-border)', overflow: 'hidden', flexShrink: 0, background: deliverable.kind === 'visual' ? `${accent}12` : '#fff' }}
      >
        {deliverable.kind === 'mockup' || deliverable.kind === 'visual' ? (
          <Stack gap={5} p={8}>
            <Box h={10} w="60%" style={{ background: deliverable.kind === 'visual' ? accent : '#d9d6cf', borderRadius: 3 }} />
            <Box h={28} style={{ background: deliverable.kind === 'visual' ? `${accent}55` : '#ecebe7', borderRadius: 4 }} />
            <Group gap={5} grow>
              <Box h={20} style={{ background: '#ecebe7', borderRadius: 3 }} />
              <Box h={20} style={{ background: '#ecebe7', borderRadius: 3 }} />
              <Box h={20} style={{ background: deliverable.kind === 'visual' ? accent : '#d9d6cf', borderRadius: 3 }} />
            </Group>
          </Stack>
        ) : (
          <Stack align="center" justify="center" h="100%">
            <Icon size={30} color={accent} stroke={1.4} />
          </Stack>
        )}
      </Box>
      <Stack gap={2} justify="center">
        <Text size="sm" fw={500}>
          {deliverable.label}
        </Text>
        <Text size="xs" c="dimmed">
          Aperçu fictif — aucun fichier réel généré
        </Text>
      </Stack>
    </Group>
  );
}
