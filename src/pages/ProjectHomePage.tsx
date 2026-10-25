import { Button, Grid, SimpleGrid, Stack } from '@mantine/core';
import { IconBrain, IconBuildingStore, IconClockExclamation, IconSpeakerphone, IconStack2, IconUserCheck, IconUsersGroup } from '@tabler/icons-react';
import { Navigate } from 'react-router-dom';
import { paths } from '@/core';
import { MemoryList } from '@/components/domain/MemoryList';
import { ValidationsBlock, WeekBlock } from '@/components/domain/OverviewBlocks';
import { AgentStack, PageHeader, SectionCard, StatCard } from '@/components/ui';
import { useProject } from '@/hooks/useProject';
import { useKpis } from '@/store/selectors';
import { useUi } from '@/store/ui';

/** Accueil d'un projet. Les projets limités à la communication s'ouvrent directement dessus. */
export default function ProjectHomePage() {
  const project = useProject()!;
  const k = useKpis(project.id);
  const openModal = useUi((s) => s.openModal);

  if (!project.modules.includes('restaurants')) return <Navigate to={paths.communication(project.id)} replace />;

  return (
    <>
      <PageHeader
        title={project.name}
        description={project.summary}
        actions={
          <>
            <AgentStack agentIds={project.agentIds} max={5} />
            <Button leftSection={<IconUsersGroup size={16} />} onClick={() => openModal('meeting', { projectId: project.id })}>
              Réunion {project.name}
            </Button>
          </>
        }
      />
      <SimpleGrid cols={{ base: 2, md: 5 }} spacing="md" mb="md">
        <StatCard label="Restaurants actifs" value={k.activeRestaurants} icon={<IconBuildingStore size={17} />} tone="sage" to={paths.restaurants()} />
        <StatCard label="Sites en production" value={k.sitesInProduction} icon={<IconStack2 size={17} />} to={paths.production()} />
        <StatCard label="À valider" value={k.pendingValidations} icon={<IconUserCheck size={17} />} tone="night" />
        <StatCard label="Publications semaine" value={k.postsThisWeek} icon={<IconSpeakerphone size={17} />} tone="blue" to={paths.communication(project.id)} />
        <StatCard label="Tâches en retard" value={k.lateTasks} icon={<IconClockExclamation size={17} />} tone={k.lateTasks ? 'red' : 'sage'} highlight={k.lateTasks > 0} to={`${paths.tasks()}?projet=${project.id}`} />
      </SimpleGrid>
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <ValidationsBlock projectId={project.id} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Stack gap="md">
            <WeekBlock projectId={project.id} />
            <SectionCard title="Mémoire du projet" subtitle="Ce que les agents savent de ce projet" icon={<IconBrain size={18} />}>
              <MemoryList notes={project.memory.slice(0, 5)} />
            </SectionCard>
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  );
}
