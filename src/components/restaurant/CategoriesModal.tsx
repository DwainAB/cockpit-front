import { ActionIcon, Button, Group, Modal, Select, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { IconCheck, IconPencil, IconTrash, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { yumcoApi, type CategoryKind, type YumcoCategory } from '@/api/yumco';
import { ConfirmModal } from '@/components/ui';
import { notifySuccess } from '@/lib/notify';
import { categoryKind } from './labels';

const kinds = Object.entries(categoryKind).map(([value, label]) => ({ value, label }));

interface Props {
  restaurantId: string;
  categories: YumcoCategory[];
  /** Nombre de produits par catégorie, pour prévenir avant une suppression. */
  productCount: (categoryId: number) => number;
  opened: boolean;
  onClose: () => void;
  onChanged: () => void;
}

/** Catégories de la carte : ajout, renommage, suppression. */
export function CategoriesModal({ restaurantId, categories, productCount, opened, onClose, onChanged }: Props) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CategoryKind>('main');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: number; name: string; kind: CategoryKind } | null>(null);
  const [deleting, setDeleting] = useState<YumcoCategory | null>(null);

  const wrap = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      notifySuccess(done);
      onChanged();
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Catégories de la carte" centered size="lg">
      <Stack gap="xs">
        {categories.length === 0 && (
          <Text size="sm" c="dimmed">
            Aucune catégorie pour l’instant.
          </Text>
        )}
        {categories.map((c) =>
          editing?.id === c.id ? (
            <Group key={c.id} gap="xs" wrap="nowrap">
              <TextInput style={{ flex: 1 }} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.currentTarget.value })} size="sm" />
              <Select w={170} size="sm" data={kinds} value={editing.kind} onChange={(v) => v && setEditing({ ...editing, kind: v as CategoryKind })} allowDeselect={false} />
              <ActionIcon
                variant="light"
                color="sage"
                loading={busy}
                disabled={!editing.name.trim()}
                aria-label="Enregistrer"
                onClick={async () => {
                  if (await wrap(() => yumcoApi.updateCategory(restaurantId, c.id, editing.name.trim(), editing.kind), 'Catégorie modifiée')) setEditing(null);
                }}
              >
                <IconCheck size={16} />
              </ActionIcon>
              <ActionIcon variant="subtle" color="gray" aria-label="Annuler" onClick={() => setEditing(null)}>
                <IconX size={16} />
              </ActionIcon>
            </Group>
          ) : (
            <Group key={c.id} justify="space-between" wrap="nowrap">
              <div>
                <Text size="sm" fw={600}>
                  {c.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {categoryKind[c.kind] ?? c.kind} · {productCount(c.id)} produit(s)
                </Text>
              </div>
              <Group gap={4} wrap="nowrap">
                <Tooltip label="Renommer">
                  <ActionIcon variant="subtle" color="gray" aria-label="Renommer" onClick={() => setEditing({ id: c.id, name: c.name, kind: c.kind })}>
                    <IconPencil size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Supprimer">
                  <ActionIcon variant="subtle" color="red" aria-label="Supprimer" onClick={() => setDeleting(c)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          ),
        )}

        <Text size="sm" fw={600} mt="md">
          Nouvelle catégorie
        </Text>
        <Group gap="xs" wrap="nowrap" align="flex-end">
          <TextInput style={{ flex: 1 }} placeholder="Ex. : Pizzas" value={name} onChange={(e) => setName(e.currentTarget.value)} />
          <Select w={170} data={kinds} value={kind} onChange={(v) => v && setKind(v as CategoryKind)} allowDeselect={false} />
          <Button
            loading={busy}
            disabled={!name.trim()}
            onClick={async () => {
              if (await wrap(() => yumcoApi.createCategory(restaurantId, name.trim(), kind), 'Catégorie ajoutée')) setName('');
            }}
          >
            Ajouter
          </Button>
        </Group>
      </Stack>

      <ConfirmModal
        opened={deleting !== null}
        title="Supprimer la catégorie ?"
        message={
          deleting && productCount(deleting.id) > 0
            ? `« ${deleting.name} » contient ${productCount(deleting.id)} produit(s). Ils resteront sur la carte, sans catégorie.`
            : `« ${deleting?.name} » sera supprimée de la carte.`
        }
        confirmLabel="Supprimer"
        onClose={() => setDeleting(null)}
        onConfirm={() => wrap(() => yumcoApi.deleteCategory(restaurantId, deleting!.id), 'Catégorie supprimée')}
      />
    </Modal>
  );
}
