import { Box, Button, Card, Grid, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconArrowRight, IconListCheck, IconUsersGroup } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { capitalize, euro, today, type Project } from '@/core';
import { AlertsBlock, ValidationsBlock, WeekBlock } from '@/components/domain/OverviewBlocks';
import { projectNav } from '@/components/layout/nav';
import { useStore } from '@/store';
import { useKpis, usePendingValidations } from '@/store/selectors';
import { useUi } from '@/store/ui';

/** Vue d'ensemble de tous les projets : une carte par projet, puis ce qui demande une action. */
export default function DashboardPage() {
  const projects = useStore((s) => s.projects);
  const name = useStore((s) => s.settings.profile.name.split(' ')[0]);
  const pending = usePendingValidations();
  const openModal = useUi((s) => s.openModal);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
        <div>
          <Text c="dimmed" size="sm">
            {capitalize(today().format('dddd D MMMM YYYY'))}
          </Text>
          <Text fz={{ base: 24, sm: 28 }} fw={700} style={{ letterSpacing: '-0.02em' }}>
            Bonjour {name} 👋
          </Text>
          <Text c="dimmed" size="sm" mt={2}>
            {pending.length ? `${pending.length} élément${pending.length > 1 ? 's attendent' : ' attend'} votre validation.` : 'Rien à valider pour le moment.'}
          </Text>
        </div>
        <Group gap="sm">
          <Button variant="default" leftSection={<IconListCheck size={16} />} onClick={() => openModal('task')}>
            Créer une tâche
          </Button>
          <Button leftSection={<IconUsersGroup size={16} />} onClick={() => openModal('meeting')}>
            Nouvelle réunion
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </SimpleGrid>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Stack gap="md">
            <ValidationsBlock />
            <AlertsBlock />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <WeekBlock />
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

function ProjectCard({ project: p }: { project: Project }) {
  const k = useKpis(p.id);
  const stats = [
    ...(p.modules.includes('restaurants')
      ? [
          { label: 'Restaurants actifs', value: k.activeRestaurants },
          { label: 'Sites en production', value: k.sitesInProduction },
        ]
      : []),
    ...(p.modules.includes('communication') ? [{ label: 'Publications cette semaine', value: k.postsThisWeek }] : []),
    { label: 'À valider', value: k.pendingValidations },
    { label: 'Coûts IA ce mois', value: euro(k.monthCosts) },
  ];
  return (
    <Card component={Link} to={projectNav(p)[0].to} className="hover-lift" style={{ textDecoration: 'none', borderTop: `3px solid ${p.color}` }}>
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <div>
          <Text fw={700} size="lg">
            {p.name}
          </Text>
          <Text size="xs" c="dimmed">
            {p.category}
          </Text>
        </div>
        <IconArrowRight size={18} color="#8a8999" />
      </Group>
      <SimpleGrid cols={2} spacing="xs" verticalSpacing="sm">
        {stats.map((s) => (
          <Box key={s.label}>
            <Text fz={22} fw={700} lh={1.1}>
              {s.value}
            </Text>
            <Text size="xs" c="dimmed">
              {s.label}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Card>
  );
}
