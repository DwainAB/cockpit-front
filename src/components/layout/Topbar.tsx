import { ActionIcon, Avatar, Box, Burger, Button, Group, Kbd, Menu, Text, UnstyledButton } from '@mantine/core';
import { spotlight } from '@mantine/spotlight';
import { IconBuildingStore, IconChevronDown, IconMessagePlus, IconUsersGroup, IconListCheck, IconLogout, IconPlus, IconRefresh, IconSearch, IconSettings, IconBulb } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/core';
import { api } from '@/api';
import { useConnection } from '@/api/connection';
import { useStore } from '@/store';
import { useUi } from '@/store/ui';
import { notifyInfo } from '@/lib/notify';
import { Breadcrumb } from './Breadcrumb';
import { NotificationsMenu } from './NotificationsMenu';

export function Topbar({ mobileOpened, toggleMobile }: { mobileOpened: boolean; toggleMobile: () => void }) {
  const openModal = useUi((s) => s.openModal);
  const profile = useStore((s) => s.settings.profile);
  const navigate = useNavigate();
  // Avec le backend, les données sont en base : pas de réinitialisation.
  const mock = useConnection((s) => s.mode === 'mock');

  return (
    <Group h="100%" px={{ base: 'sm', sm: 'lg' }} justify="space-between" wrap="nowrap" gap="sm">
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" aria-label="Menu" />
        <Breadcrumb />
      </Group>

      <Group gap="xs" wrap="nowrap">
        <UnstyledButton
          onClick={() => spotlight.open()}
          visibleFrom="md"
          px="sm"
          h={36}
          w={260}
          style={{ border: '1px solid var(--app-border)', borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <IconSearch size={16} color="#8a8999" />
          <Text size="sm" c="dimmed" style={{ flex: 1 }}>
            Rechercher…
          </Text>
          <Kbd size="xs">⌘K</Kbd>
        </UnstyledButton>
        <ActionIcon variant="subtle" color="gray" size="lg" hiddenFrom="md" onClick={() => spotlight.open()} aria-label="Rechercher">
          <IconSearch size={20} />
        </ActionIcon>

        <Menu position="bottom-end" width={230} shadow="md">
          <Menu.Target>
            <Button leftSection={<IconPlus size={16} />} rightSection={<IconChevronDown size={14} />} size="sm" aria-label="Créer">
              <Box component="span" visibleFrom="xs">
                Créer
              </Box>
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Nouvelle action</Menu.Label>
            <Menu.Item leftSection={<IconUsersGroup size={16} />} onClick={() => openModal('meeting')}>
              Nouvelle réunion
            </Menu.Item>
            <Menu.Item leftSection={<IconMessagePlus size={16} />} onClick={() => openModal('conversation')}>
              Nouvelle discussion
            </Menu.Item>
            <Menu.Item leftSection={<IconListCheck size={16} />} onClick={() => openModal('task')}>
              Créer une tâche
            </Menu.Item>
            <Menu.Item leftSection={<IconBulb size={16} />} onClick={() => openModal('idea')}>
              Idée de contenu
            </Menu.Item>
            <Menu.Divider />
            <Menu.Label>Yumco</Menu.Label>
            <Menu.Item leftSection={<IconBuildingStore size={16} />} onClick={() => navigate(paths.newDraft())}>
              Remplir le formulaire (nouveau site)
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <NotificationsMenu />

        <Menu position="bottom-end" width={220} shadow="md">
          <Menu.Target>
            <UnstyledButton aria-label="Profil">
              <Group gap={8} wrap="nowrap">
                <Avatar radius="xl" size={34} color="night" variant="filled">
                  {profile.name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')}
                </Avatar>
              </Group>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>
              {profile.name}
              <br />
              <Text span size="xs" c="dimmed">
                {profile.email}
              </Text>
            </Menu.Label>
            <Menu.Item leftSection={<IconSettings size={16} />} onClick={() => navigate('/settings')}>
              Paramètres
            </Menu.Item>
            {mock && (
              <Menu.Item
                leftSection={<IconRefresh size={16} />}
                onClick={async () => {
                  await api.demo.reset();
                  notifyInfo('Démo réinitialisée', 'Les données fictives ont été restaurées.');
                }}
              >
                Réinitialiser les données de démo
              </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item leftSection={<IconLogout size={16} />} color="red" onClick={() => notifyInfo('Déconnexion simulée', 'Aucune authentification n’est connectée.')}>
              Se déconnecter
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
