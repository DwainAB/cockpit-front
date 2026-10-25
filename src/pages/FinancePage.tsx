import { Alert, Anchor, Box, Button, Group, Progress, SimpleGrid, Stack, Table, Text } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { IconBuildingStore, IconCash, IconCloudOff, IconCoin, IconReceipt, IconRefresh, IconWallet } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { costCategoryLabel, euro, paths, RESTAURANT_PROJECT, type CostCategory, type MonthlyFinance } from '@/core';
import { api } from '@/api';
import { MockNotice, PageHeader, SectionCard, StatCard } from '@/components/ui';
import { useProject } from '@/hooks/useProject';
import { useStore } from '@/store';

// Palette catégorielle validée (contraste et daltonisme) : indigo, ocre, bleu ciel, prune.
const CATEGORY_COLORS: Record<CostCategory, string> = { sites: '#4353C9', images: '#BF7514', videos: '#3FA0C8', conversations: '#A54C9E' };
const SERIES = { revenue: '#4353C9', costs: '#BF7514' };

const sumMonthly = (series: MonthlyFinance[][]): MonthlyFinance[] =>
  (series[0] ?? []).map((m, i) => ({
    month: m.month,
    revenue: series.reduce((s, x) => s + (x[i]?.revenue ?? 0), 0),
    costs: series.reduce((s, x) => s + (x[i]?.costs ?? 0), 0),
  }));

/** Finance globale (`/finance`) ou d'un projet (`/p/:projectId/finance`). */
export default function FinancePage() {
  const project = useProject();
  const projects = useStore((s) => s.projects);
  const restaurants = useStore((s) => s.restaurants);
  const finance = useStore((s) => s.finance);
  const [syncError, setSyncError] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const data = useMemo(() => {
    const scoped = finance.projects.filter((f) => !project || f.projectId === project.id);
    const monthly = sumMonthly(scoped.map((f) => f.monthly));
    const costsByCategory = scoped.reduce(
      (acc, f) => {
        (Object.keys(acc) as CostCategory[]).forEach((k) => (acc[k] += f.costsByCategory[k]));
        return acc;
      },
      { sites: 0, images: 0, videos: 0, conversations: 0 } as Record<CostCategory, number>,
    );
    const withRestaurants = scoped.some((f) => f.projectId === RESTAURANT_PROJECT);
    const subscribed = withRestaurants ? restaurants.filter((r) => r.billing === 'subscribed').length : 0;
    const followed = restaurants.filter((r) => ['active', 'production', 'pending'].includes(r.status)).length;
    const monthCosts = monthly.at(-1)?.costs ?? 0;
    const budget = scoped.reduce((s, f) => s + f.budget, 0);
    return {
      scoped,
      monthly,
      costsByCategory,
      withRestaurants,
      hasRevenue: scoped.some((f) => f.revenueSource),
      mrr: subscribed * finance.subscriptionPrice,
      subscribed,
      trial: withRestaurants ? restaurants.filter((r) => r.billing === 'trial').length : 0,
      perRestaurant: followed ? (finance.projects.find((f) => f.projectId === RESTAURANT_PROJECT)?.monthly.at(-1)?.costs ?? 0) / followed : 0,
      monthCosts,
      budget,
    };
  }, [finance, project, restaurants]);

  const categories = (Object.entries(data.costsByCategory) as [CostCategory, number][]).filter(([, v]) => v > 0);
  const maxCategory = Math.max(1, ...categories.map(([, v]) => v));
  const budgetPct = data.budget ? Math.round((data.monthCosts / data.budget) * 100) : 0;
  const chartData = data.monthly.map((m) => ({ month: m.month, Revenus: m.revenue, 'Coûts IA': m.costs }));

  return (
    <>
      <PageHeader
        title={project ? `Finance — ${project.name}` : 'Finance — tous les projets'}
        description={project ? 'Revenus et coûts IA estimés de ce projet.' : 'Vue consolidée des revenus et des coûts IA de tous les projets.'}
        actions={
          data.withRestaurants && (
            <Button
              variant="default"
              leftSection={<IconRefresh size={16} />}
              loading={syncing}
              onClick={async () => {
                setSyncing(true);
                await api.integrations
                  .sync('stripe')
                  .catch(() => setSyncError(true))
                  .finally(() => setSyncing(false));
              }}
            >
              Synchroniser Stripe
            </Button>
          )
        }
      />
      <MockNotice>
        <b>Données fictives — intégrations non connectées.</b> Estimations à titre indicatif, pas des conseils financiers.
      </MockNotice>
      {syncError && (
        <Alert color="red" variant="light" icon={<IconCloudOff size={18} />} title="Synchronisation impossible" mb="lg" withCloseButton onClose={() => setSyncError(false)}>
          L’intégration Stripe n’est pas connectée dans cette version.
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md" mb="md">
        <StatCard
          label="Revenus récurrents"
          value={data.hasRevenue ? euro(data.mrr) : '—'}
          icon={<IconCash size={17} />}
          hint={data.hasRevenue ? `${data.subscribed} abonnement${data.subscribed > 1 ? 's' : ''} × ${finance.subscriptionPrice} €` : 'Aucun revenu suivi pour ce projet'}
        />
        <StatCard label="Coûts IA ce mois" value={euro(data.monthCosts)} icon={<IconReceipt size={17} />} tone="orange" hint="Estimation" />
        <StatCard
          label="Budget IA utilisé"
          value={`${budgetPct} %`}
          icon={<IconWallet size={17} />}
          tone={budgetPct > 80 ? 'red' : 'sage'}
          hint={`${euro(data.monthCosts)} sur ${euro(data.budget)}`}
        />
        {data.withRestaurants && project ? (
          <StatCard label="Coût IA par restaurant" value={euro(data.perRestaurant, 2)} icon={<IconBuildingStore size={17} />} tone="blue" hint={`${data.trial} en période d’essai`} />
        ) : (
          <StatCard
            label="Résultat du mois"
            value={euro(data.mrr - data.monthCosts)}
            icon={<IconCoin size={17} />}
            tone={data.mrr - data.monthCosts >= 0 ? 'sage' : 'red'}
            hint="Revenus récurrents − coûts IA"
          />
        )}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: project ? 2 : 1 }} spacing="md">
        <SectionCard title={data.hasRevenue ? 'Revenus et coûts IA par mois' : 'Coûts IA par mois'} subtitle="En euros, estimations" icon={<IconCoin size={18} />}>
          <BarChart
            h={260}
            data={chartData}
            dataKey="month"
            series={data.hasRevenue ? [{ name: 'Revenus', color: SERIES.revenue }, { name: 'Coûts IA', color: SERIES.costs }] : [{ name: 'Coûts IA', color: SERIES.costs }]}
            valueFormatter={(v) => euro(v)}
            withLegend={data.hasRevenue}
            legendProps={{ verticalAlign: 'top', height: 36 }}
            gridAxis="y"
            barProps={{ radius: [4, 4, 0, 0] }}
            barChartProps={{ barGap: 2 }}
          />
        </SectionCard>

        {project && (
          <SectionCard title="Coûts IA ce mois, par catégorie">
            <Stack gap="md">
              {categories.map(([k, v]) => (
                <div key={k}>
                  <Group justify="space-between" mb={4}>
                    <Group gap={8}>
                      <Box w={10} h={10} style={{ borderRadius: 3, background: CATEGORY_COLORS[k] }} />
                      <Text size="sm">{costCategoryLabel[k]}</Text>
                    </Group>
                    <Text size="sm" fw={600}>
                      {euro(v)}
                    </Text>
                  </Group>
                  <Progress value={(v / maxCategory) * 100} color={CATEGORY_COLORS[k]} size="sm" />
                </div>
              ))}
            </Stack>
          </SectionCard>
        )}
      </SimpleGrid>

      {!project && (
        <SectionCard title="Par projet" mt="md">
          <Table.ScrollContainer minWidth={560}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Projet</Table.Th>
                  <Table.Th ta="right">Revenus du mois</Table.Th>
                  <Table.Th ta="right">Coûts IA du mois</Table.Th>
                  <Table.Th>Budget IA</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.scoped.map((f) => {
                  const p = projects.find((x) => x.id === f.projectId);
                  const last = f.monthly.at(-1);
                  const pct = f.budget ? Math.round(((last?.costs ?? 0) / f.budget) * 100) : 0;
                  return (
                    <Table.Tr key={f.projectId}>
                      <Table.Td>
                        <Group gap={8}>
                          <Box w={10} h={10} style={{ borderRadius: 3, background: p?.color }} />
                          <Text size="sm" fw={600}>
                            {p?.name}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td ta="right">{f.revenueSource ? euro(last?.revenue ?? 0) : <Text span size="sm" c="dimmed">—</Text>}</Table.Td>
                      <Table.Td ta="right">{euro(last?.costs ?? 0)}</Table.Td>
                      <Table.Td miw={160}>
                        <Group gap="xs" wrap="nowrap">
                          <Progress value={Math.min(pct, 100)} color={pct > 80 ? 'orange' : 'sage'} size="sm" style={{ flex: 1 }} />
                          <Text size="xs" w={70}>
                            {pct} % de {euro(f.budget)}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Anchor component={Link} to={paths.finance(f.projectId)} size="sm">
                          Détail
                        </Anchor>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </SectionCard>
      )}
    </>
  );
}
