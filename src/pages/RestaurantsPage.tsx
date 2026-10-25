import { Badge, Button, Chip, Group, Progress, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable, EmptyState, PageHeader, PageSkeleton, StatusBadge, type Column } from '@/components/ui';
import { currentStepLabel, fmtDate, paths, productionStage, productionStages, type Restaurant, restaurantStatus, type RestaurantStatus, workflowProgress } from '@/core';
import { useSimulatedLoading } from '@/lib/useSimulatedLoading';
import { useStore } from '@/store';

export default function RestaurantsPage() {
  const loading = useSimulatedLoading();
  const restaurants = useStore((s) => s.restaurants);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [service, setService] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      restaurants.filter((r) => {
        const hay = `${r.name} ${r.cuisine} ${r.city} ${r.contact.name} ${r.email}`.toLowerCase();
        return (
          (!q || hay.includes(q.toLowerCase())) &&
          (status === 'all' || r.status === status) &&
          (!service || (service === 'reservation' ? r.services.reservation : r.services.onlineOrdering)) &&
          (!stage || productionStage(r) === stage)
        );
      }),
    [restaurants, q, status, service, stage],
  );

  if (loading) return <PageSkeleton cards={0} rows={6} />;

  const count = (s: RestaurantStatus) => restaurants.filter((r) => r.status === s).length;

  const columns: Column<Restaurant>[] = [
    {
      key: 'name',
      header: 'Restaurant',
      sortValue: (r) => r.name,
      render: (r) => (
        <Group gap="sm" wrap="nowrap">
          <div style={{ width: 8, height: 32, borderRadius: 4, background: r.accent, flexShrink: 0 }} />
          <div>
            <Text size="sm" fw={600}>
              {r.name}
            </Text>
            <Text size="xs" c="dimmed">
              {r.cuisine} · {r.city}
            </Text>
          </div>
        </Group>
      ),
    },
    {
      key: 'contact',
      header: 'Contact principal',
      sortValue: (r) => r.contact.name,
      render: (r) => (
        <div>
          <Text size="sm">{r.contact.name}</Text>
          <Text size="xs" c="dimmed">
            {r.contact.email}
          </Text>
          <Text size="xs" c="dimmed">
            {r.contact.phone}
          </Text>
        </div>
      ),
    },
    { key: 'status', header: 'Statut', sortValue: (r) => r.status, render: (r) => <StatusBadge meta={restaurantStatus[r.status]} /> },
    {
      key: 'stage',
      header: 'Étape du site',
      sortValue: (r) => workflowProgress(r),
      render: (r) => (
        <div style={{ minWidth: 150 }}>
          <Text size="xs" mb={4}>
            {currentStepLabel(r)}
          </Text>
          <Progress value={workflowProgress(r)} size="xs" color={r.blocker ? 'red' : 'sage'} />
        </div>
      ),
    },
    {
      key: 'services',
      header: 'Services',
      render: (r) => (
        <Group gap={4}>
          {r.services.onlineOrdering && (
            <Badge size="sm" variant="light" color="blue" tt="none">
              Commande
            </Badge>
          )}
          {r.services.reservation && (
            <Badge size="sm" variant="light" color="grape" tt="none">
              Réservation
            </Badge>
          )}
          {!r.services.onlineOrdering && !r.services.reservation && (
            <Text size="xs" c="dimmed">
              —
            </Text>
          )}
        </Group>
      ),
    },
    { key: 'created', header: 'Inscription', sortValue: (r) => r.createdAt, render: (r) => <Text size="sm">{fmtDate(r.createdAt)}</Text> },
    {
      key: 'next',
      header: 'Prochaine action',
      render: (r) => (
        <Text size="sm" c={r.blocker ? 'red.7' : undefined} maw={220}>
          {r.blocker ? `⚠ ${r.blocker}` : r.nextAction}
        </Text>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Restaurants"
        description="Vos clients restaurateurs, leur statut et l’avancement de leur site."
        actions={
          <Button leftSection={<IconPlus size={16} />} component={Link} to={paths.newDraft()}>
            Remplir le formulaire
          </Button>
        }
      />
      <Stack gap="md">
        <Chip.Group value={status} onChange={(v) => setStatus(v as string)}>
          <Group gap={8}>
            <Chip value="all" size="sm" variant="light">
              Tous ({restaurants.length})
            </Chip>
            {(Object.keys(restaurantStatus) as RestaurantStatus[]).map((s) => (
              <Chip key={s} value={s} size="sm" variant="light">
                {restaurantStatus[s].label} ({count(s)})
              </Chip>
            ))}
          </Group>
        </Chip.Group>
        <Group gap="sm" wrap="wrap">
          <TextInput placeholder="Nom, ville, contact…" leftSection={<IconSearch size={16} />} value={q} onChange={(e) => setQ(e.currentTarget.value)} w={{ base: '100%', sm: 280 }} />
          <Select placeholder="Étape du site" clearable data={productionStages.map((s) => ({ value: s.key, label: s.label }))} value={stage} onChange={setStage} w={230} />
          <Select
            placeholder="Service"
            clearable
            data={[
              { value: 'onlineOrdering', label: 'Commande en ligne' },
              { value: 'reservation', label: 'Réservation' },
            ]}
            value={service}
            onChange={setService}
            w={190}
          />
        </Group>
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(paths.restaurant(r.id))}
          minWidth={1000}
          defaultSort={{ key: 'created', dir: 'desc' }}
          empty={
            restaurants.length === 0 ? (
              <EmptyState title="Aucun restaurant pour l’instant" description="Les restaurants seront importés depuis votre base de données. Pour créer un site, remplissez un formulaire depuis Production des sites." />
            ) : (
            <EmptyState
              title="Aucun restaurant ne correspond"
              description="Essayez d’élargir les filtres."
              action={
                <Button
                  variant="light"
                  onClick={() => {
                    setQ('');
                    setStatus('all');
                    setService(null);
                    setStage(null);
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              }
            />
            )
          }
        />
      </Stack>
    </>
  );
}

