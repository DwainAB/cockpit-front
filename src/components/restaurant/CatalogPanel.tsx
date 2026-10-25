import { ActionIcon, Avatar, Badge, Button, Card, Group, SegmentedControl, Select, Stack, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { IconCategory, IconPencil, IconPlus, IconSearch, IconToolsKitchen2, IconTrash } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { yumcoApi, type YumcoProduct } from '@/api/yumco';
import { ConfirmModal, EmptyState, SectionCard } from '@/components/ui';
import { euro } from '@/core';
import { useRemote } from '@/hooks/useRemote';
import { notifySuccess } from '@/lib/notify';
import { CategoriesModal } from './CategoriesModal';
import { ProductModal } from './ProductModal';
import { RemoteState } from './RemoteState';

const NO_CATEGORY = 'none';

/** Carte du restaurant (base Yumco) : produits par catégorie, filtres, ajout, modification, suppression. */
export function CatalogPanel({ restaurantId }: { restaurantId: string }) {
  const { data, loading, error, reload } = useRemote(() => yumcoApi.catalog(restaurantId), [restaurantId]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [availability, setAvailability] = useState('all');
  const [editing, setEditing] = useState<YumcoProduct | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<YumcoProduct | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const products = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.products ?? []).filter(
      (p) =>
        (!needle || p.name.toLowerCase().includes(needle) || p.description?.toLowerCase().includes(needle)) &&
        (!category || (category === NO_CATEGORY ? !p.category : String(p.category?.id) === category)) &&
        (availability === 'all' || (availability === 'available') === p.is_available),
    );
  }, [data, q, category, availability]);

  /** Groupes affichés dans l'ordre des catégories, « Sans catégorie » à la fin. */
  const groups = useMemo(() => {
    const cats = data?.categories ?? [];
    const list = cats.map((c) => ({ key: String(c.id), name: c.name, items: products.filter((p) => p.category?.id === c.id) }));
    list.push({ key: NO_CATEGORY, name: 'Sans catégorie', items: products.filter((p) => !p.category) });
    return list.filter((g) => g.items.length);
  }, [data, products]);

  if (!data) return <RemoteState loading={loading} error={error} onRetry={reload} />;

  const productCount = (categoryId: number) => data.products.filter((p) => p.category?.id === categoryId).length;

  return (
    <Stack gap="md">
      <SectionCard
        title={`Produits (${data.products.length})`}
        icon={<IconToolsKitchen2 size={18} />}
        action={
          <Group gap="xs">
            <Button size="compact-sm" variant="default" leftSection={<IconCategory size={14} />} onClick={() => setCategoriesOpen(true)}>
              Catégories
            </Button>
            <Button size="compact-sm" leftSection={<IconPlus size={14} />} onClick={() => setEditing(null)}>
              Produit
            </Button>
          </Group>
        }
      >
        <Group gap="sm" mb="md" wrap="wrap">
          <TextInput placeholder="Rechercher un produit" leftSection={<IconSearch size={16} />} value={q} onChange={(e) => setQ(e.currentTarget.value)} style={{ flex: '1 1 220px' }} />
          <Select
            placeholder="Toutes les catégories"
            clearable
            value={category}
            onChange={setCategory}
            data={[...data.categories.map((c) => ({ value: String(c.id), label: c.name })), { value: NO_CATEGORY, label: 'Sans catégorie' }]}
            w={220}
          />
          <SegmentedControl
            value={availability}
            onChange={setAvailability}
            data={[
              { value: 'all', label: 'Tous' },
              { value: 'available', label: 'Disponibles' },
              { value: 'unavailable', label: 'Indisponibles' },
            ]}
          />
        </Group>

        {groups.length === 0 ? (
          <EmptyState
            compact
            title={data.products.length ? 'Aucun produit ne correspond aux filtres' : 'Carte vide'}
            description={data.products.length ? undefined : 'Ajoutez le premier produit du restaurant.'}
          />
        ) : (
          <Table.ScrollContainer minWidth={640}>
            <Table verticalSpacing="xs" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Produit</Table.Th>
                  <Table.Th w={110}>Prix</Table.Th>
                  <Table.Th>Disponibilité</Table.Th>
                  <Table.Th w={90} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {groups.map((g) => [
                  <Table.Tr key={`g-${g.key}`}>
                    <Table.Td colSpan={4} bg="var(--app-surface-2)">
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                        {g.name} · {g.items.length}
                      </Text>
                    </Table.Td>
                  </Table.Tr>,
                  ...g.items.map((p) => (
                    <Table.Tr key={p.id}>
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Avatar src={p.image_url} radius="sm" size={40} color="gray">
                            <IconToolsKitchen2 size={18} />
                          </Avatar>
                          <div style={{ minWidth: 0 }}>
                            <Text size="sm" fw={600} truncate>
                              {p.name}
                            </Text>
                            {p.description && (
                              <Text size="xs" c="dimmed" lineClamp={1}>
                                {p.description}
                              </Text>
                            )}
                            {p.allergens.length > 0 && (
                              <Text size="xs" c="orange.8">
                                Allergènes : {p.allergens.join(', ')}
                              </Text>
                            )}
                          </div>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {euro(Number(p.price), 2)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          {p.is_available ? (
                            <Badge size="sm" variant="light" color="sage" tt="none">
                              Disponible
                            </Badge>
                          ) : (
                            <Badge size="sm" variant="light" color="gray" tt="none">
                              Indisponible
                            </Badge>
                          )}
                          {!p.available_online && (
                            <Badge size="sm" variant="outline" color="gray" tt="none">
                              Pas en ligne
                            </Badge>
                          )}
                          {!p.available_onsite && (
                            <Badge size="sm" variant="outline" color="gray" tt="none">
                              Pas sur place
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip label="Modifier">
                            <ActionIcon variant="subtle" color="gray" aria-label="Modifier" onClick={() => setEditing(p)}>
                              <IconPencil size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Supprimer">
                            <ActionIcon variant="subtle" color="red" aria-label="Supprimer" onClick={() => setDeleting(p)}>
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  )),
                ])}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </SectionCard>

      {data.menus.length > 0 && (
        <SectionCard title={`Menus (${data.menus.length})`} subtitle="Consultation : les menus se gèrent depuis l’application du restaurant" icon={<IconToolsKitchen2 size={18} />}>
          <Stack gap="xs">
            {data.menus.map((m) => (
              <Card key={m.id} withBorder={false} shadow="none" padding="sm" bg="var(--app-surface-2)">
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    {m.name}
                  </Text>
                  <Group gap="xs">
                    {!m.is_available && (
                      <Badge size="sm" variant="light" color="gray" tt="none">
                        Indisponible
                      </Badge>
                    )}
                    <Text size="sm" fw={600}>
                      {euro(Number(m.price), 2)}
                    </Text>
                  </Group>
                </Group>
                {m.categories.map((c) => (
                  <Text key={c.id} size="xs" c="dimmed">
                    {c.name} : {c.options.map((o) => o.name).join(', ') || '—'}
                  </Text>
                ))}
              </Card>
            ))}
          </Stack>
        </SectionCard>
      )}

      <ProductModal
        restaurantId={restaurantId}
        product={editing ?? null}
        categories={data.categories}
        opened={editing !== undefined}
        onClose={() => setEditing(undefined)}
        onSaved={reload}
      />
      <CategoriesModal
        restaurantId={restaurantId}
        categories={data.categories}
        productCount={productCount}
        opened={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        onChanged={reload}
      />
      <ConfirmModal
        opened={deleting !== null}
        title="Supprimer le produit ?"
        message={`« ${deleting?.name} » sera retiré de la carte. Les commandes passées le conservent.`}
        confirmLabel="Supprimer"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await yumcoApi.deleteProduct(restaurantId, deleting!.id);
          notifySuccess('Produit supprimé', deleting!.name);
          reload();
        }}
      />
    </Stack>
  );
}
