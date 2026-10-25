import { ActionIcon, Badge, Button, Group, Select, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { IconKey, IconPencil, IconPlus, IconSearch, IconTrash, IconUsers } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { yumcoApi, type UserRole, type YumcoUser } from '@/api/yumco';
import { ConfirmModal, EmptyState, SectionCard } from '@/components/ui';
import { fmtDate } from '@/core';
import { useRemote } from '@/hooks/useRemote';
import { notifySuccess } from '@/lib/notify';
import { userRole } from './labels';
import { RemoteState } from './RemoteState';
import { UserModal } from './UserModal';

/** Utilisateurs du restaurant (comptes Yumco) : filtres, ajout, modification, mot de passe, suppression. */
export function UsersPanel({ restaurantId, yumcoRestaurantId }: { restaurantId: string; yumcoRestaurantId: number }) {
  const { data, loading, error, reload } = useRemote(() => yumcoApi.users(restaurantId), [restaurantId]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [editing, setEditing] = useState<YumcoUser | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<YumcoUser | null>(null);
  const [resetting, setResetting] = useState<YumcoUser | null>(null);

  const roleOf = (u: YumcoUser) => u.roles.find((r) => r.restaurant_id === yumcoRestaurantId)?.type as UserRole | undefined;

  const users = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter(
      (u) => (!needle || `${u.first_name} ${u.last_name} ${u.email} ${u.phone ?? ''}`.toLowerCase().includes(needle)) && (!role || roleOf(u) === role),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q, role]);

  if (!data) return <RemoteState loading={loading} error={error} onRetry={reload} />;

  return (
    <SectionCard
      title={`Utilisateurs (${data.length})`}
      icon={<IconUsers size={18} />}
      action={
        <Button size="compact-sm" leftSection={<IconPlus size={14} />} onClick={() => setEditing(null)}>
          Utilisateur
        </Button>
      }
    >
      <Group gap="sm" mb="md" wrap="wrap">
        <TextInput placeholder="Nom, e-mail, téléphone" leftSection={<IconSearch size={16} />} value={q} onChange={(e) => setQ(e.currentTarget.value)} style={{ flex: '1 1 220px' }} />
        <Select placeholder="Tous les rôles" clearable value={role} onChange={setRole} data={Object.entries(userRole).map(([value, label]) => ({ value, label }))} w={200} />
      </Group>

      {users.length === 0 ? (
        <EmptyState compact title={data.length ? 'Aucun utilisateur ne correspond aux filtres' : 'Aucun utilisateur'} description={data.length ? undefined : 'Ajoutez le compte du restaurateur ou de son équipe.'} />
      ) : (
        <Table.ScrollContainer minWidth={640}>
          <Table verticalSpacing="xs" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nom</Table.Th>
                <Table.Th>Contact</Table.Th>
                <Table.Th>Rôle</Table.Th>
                <Table.Th>Créé le</Table.Th>
                <Table.Th w={120} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((u) => {
                const r = roleOf(u);
                return (
                  <Table.Tr key={u.id}>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {u.first_name} {u.last_name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{u.email}</Text>
                      {u.phone && (
                        <Text size="xs" c="dimmed">
                          {u.phone}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Badge size="sm" variant="light" color={r === 'owner' ? 'night' : 'gray'} tt="none">
                          {r ? (userRole[r] ?? r) : '—'}
                        </Badge>
                        {u.is_admin && (
                          <Badge size="sm" variant="outline" color="red" tt="none">
                            Admin Yumco
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {fmtDate(u.created_at)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {/* Les comptes admin Yumco ne se gèrent pas depuis la fiche d'un restaurant. */}
                      {!u.is_admin && (
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip label="Modifier">
                            <ActionIcon variant="subtle" color="gray" aria-label="Modifier" onClick={() => setEditing(u)}>
                              <IconPencil size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Envoyer un nouveau mot de passe">
                            <ActionIcon variant="subtle" color="gray" aria-label="Nouveau mot de passe" onClick={() => setResetting(u)}>
                              <IconKey size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Supprimer">
                            <ActionIcon variant="subtle" color="red" aria-label="Supprimer" onClick={() => setDeleting(u)}>
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <UserModal
        restaurantId={restaurantId}
        yumcoRestaurantId={yumcoRestaurantId}
        user={editing ?? null}
        opened={editing !== undefined}
        onClose={() => setEditing(undefined)}
        onSaved={reload}
      />
      <ConfirmModal
        opened={resetting !== null}
        title="Envoyer un nouveau mot de passe ?"
        message={`Un mot de passe provisoire sera envoyé à ${resetting?.email}. L’ancien ne fonctionnera plus.`}
        confirmLabel="Envoyer"
        onClose={() => setResetting(null)}
        onConfirm={async () => {
          await yumcoApi.resetPassword(restaurantId, resetting!.id);
          notifySuccess('Nouveau mot de passe envoyé', resetting!.email);
        }}
      />
      <ConfirmModal
        opened={deleting !== null}
        title="Supprimer l’utilisateur ?"
        message={`Le compte de ${deleting?.first_name} ${deleting?.last_name} (${deleting?.email}) sera supprimé de Yumco. Cette action est définitive.`}
        confirmLabel="Supprimer"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await yumcoApi.deleteUser(restaurantId, deleting!.id);
          notifySuccess('Utilisateur supprimé', deleting!.email);
          reload();
        }}
      />
    </SectionCard>
  );
}
