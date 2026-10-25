import { Button, Group, Modal, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect, useState } from 'react';
import { yumcoApi, type UserRole, type YumcoUser } from '@/api/yumco';
import { notifySuccess } from '@/lib/notify';
import { userRole } from './labels';

interface Values {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: UserRole;
}

interface Props {
  restaurantId: string;
  yumcoRestaurantId: number;
  /** Utilisateur à modifier ; `null` : nouvel utilisateur. */
  user: YumcoUser | null;
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const roleOf = (u: YumcoUser, rid: number) => (u.roles.find((r) => r.restaurant_id === rid)?.type ?? 'staff') as UserRole;

/** Ajout ou modification d'un utilisateur du restaurant (compte Yumco). */
export function UserModal({ restaurantId, yumcoRestaurantId, user, opened, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const form = useForm<Values>({
    initialValues: { first_name: '', last_name: '', email: '', phone: '', role: 'staff' },
    validate: {
      first_name: (v) => (v.trim() ? null : 'Prénom requis'),
      last_name: (v) => (v.trim() ? null : 'Nom requis'),
      email: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? null : 'E-mail invalide'),
    },
  });

  useEffect(() => {
    if (!opened) return;
    form.setValues(
      user
        ? { first_name: user.first_name, last_name: user.last_name, email: user.email, phone: user.phone ?? '', role: roleOf(user, yumcoRestaurantId) }
        : { first_name: '', last_name: '', email: '', phone: '', role: 'staff' },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, user]);

  const submit = form.onSubmit(async (v) => {
    const input = { first_name: v.first_name.trim(), last_name: v.last_name.trim(), email: v.email.trim(), phone: v.phone.trim() || null, role: v.role };
    setSaving(true);
    try {
      if (user) await yumcoApi.updateUser(restaurantId, user.id, input);
      else await yumcoApi.createUser(restaurantId, input);
      notifySuccess(user ? 'Utilisateur modifié' : 'Utilisateur ajouté', user ? undefined : `Mot de passe provisoire envoyé à ${input.email}.`);
      onSaved();
      onClose();
    } catch {
      // Erreur déjà signalée par une notification.
    } finally {
      setSaving(false);
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title={user ? `Modifier ${user.first_name} ${user.last_name}` : 'Nouvel utilisateur'} centered>
      <form onSubmit={submit}>
        <Stack gap="sm">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Prénom" required data-autofocus {...form.getInputProps('first_name')} />
            <TextInput label="Nom" required {...form.getInputProps('last_name')} />
          </SimpleGrid>
          <TextInput label="E-mail" required type="email" {...form.getInputProps('email')} />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Téléphone" {...form.getInputProps('phone')} />
            <Select label="Rôle" allowDeselect={false} data={Object.entries(userRole).map(([value, label]) => ({ value, label }))} {...form.getInputProps('role')} />
          </SimpleGrid>
          {!user && (
            <Text size="xs" c="dimmed">
              Yumco envoie un mot de passe provisoire à cette adresse.
            </Text>
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              {user ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
