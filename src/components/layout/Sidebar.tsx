import { ActionIcon, Badge, Box, Group, Stack, Text, ThemeIcon, Tooltip, UnstyledButton } from '@mantine/core';
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconSettings, IconSparkles } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { paths } from '@/core';
import { useStore } from '@/store';
import { usePendingValidations } from '@/store/selectors';
import { globalNav, projectNav } from './nav';

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}

export function Sidebar({ collapsed, onToggle, onNavigate }: Props) {
  const { pathname } = useLocation();
  const projects = useStore((s) => s.projects);
  const pending = usePendingValidations();
  const isActive = (to: string, exact?: boolean) => (to === '/' || exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`));

  return (
    <Stack h="100%" justify="space-between" p="sm" gap="sm">
      <Stack gap={2} style={{ overflowY: 'auto' }}>
        <Group gap={10} px={collapsed ? 0 : 6} py={6} mb="sm" wrap="nowrap" justify={collapsed ? 'center' : 'flex-start'}>
          <ThemeIcon size={34} radius="md" variant="gradient" gradient={{ from: 'night.8', to: 'night.5', deg: 135 }}>
            <IconSparkles size={18} />
          </ThemeIcon>
          {!collapsed && (
            <Text fw={700} size="sm">
              Cockpit
            </Text>
          )}
        </Group>

        {globalNav.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            label={item.label}
            icon={<item.icon size={19} stroke={1.7} />}
            active={isActive(item.to)}
            collapsed={collapsed}
            onClick={onNavigate}
            badge={item.to === paths.tasks() && pending.length ? pending.length : undefined}
          />
        ))}

        {!collapsed && (
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" px={10} mt="lg" mb={4} style={{ letterSpacing: '0.05em' }}>
            Projets
          </Text>
        )}
        {collapsed && <Box h={1} bg="var(--app-border)" my="sm" />}

        {projects.map((p) => {
          const inProject = pathname.startsWith(paths.project(p.id));
          const count = pending.filter((v) => v.projectId === p.id).length;
          const items = projectNav(p);
          return (
            <Box key={p.id} mb={2}>
              <NavItem
                to={items[0].to}
                label={p.name}
                icon={<ProjectDot color={p.color} name={p.name} />}
                active={inProject && collapsed}
                collapsed={collapsed}
                onClick={onNavigate}
                badge={count || undefined}
                strong
              />
              {!collapsed && inProject && (
                <Stack gap={0} pl={18} ml={12} style={{ borderLeft: `2px solid ${p.color}33` }}>
                  {items.map((item) => (
                    <NavItem
                      key={item.to}
                      to={item.to}
                      label={item.label}
                      active={isActive(item.to, 'exact' in item && item.exact)}
                      collapsed={false}
                      onClick={onNavigate}
                      small
                    />
                  ))}
                </Stack>
              )}
            </Box>
          );
        })}
      </Stack>

      <Stack gap={4}>
        <NavItem to={paths.settings()} label="Paramètres" icon={<IconSettings size={19} stroke={1.7} />} active={isActive(paths.settings())} collapsed={collapsed} onClick={onNavigate} />
        <Group justify={collapsed ? 'center' : 'flex-end'} visibleFrom="sm">
          <Tooltip label={collapsed ? 'Déplier le menu' : 'Replier le menu'} position="right">
            <ActionIcon variant="subtle" color="gray" onClick={onToggle} aria-label="Replier le menu">
              {collapsed ? <IconLayoutSidebarLeftExpand size={18} /> : <IconLayoutSidebarLeftCollapse size={18} />}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Stack>
    </Stack>
  );
}

function ProjectDot({ color, name }: { color: string; name: string }) {
  return (
    <Box w={20} h={20} style={{ borderRadius: 6, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
      {name[0]}
    </Box>
  );
}

interface NavItemProps {
  to: string;
  label: string;
  icon?: ReactNode;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  badge?: number;
  small?: boolean;
  strong?: boolean;
}

function NavItem({ to, label, icon, active, collapsed, onClick, badge, small, strong }: NavItemProps) {
  const link = (
    <UnstyledButton
      component={NavLink}
      to={to}
      onClick={onClick}
      px={collapsed ? 0 : 10}
      py={small ? 5 : 8}
      style={{
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 10,
        background: active ? 'var(--mantine-color-night-0)' : undefined,
        color: active ? 'var(--mantine-color-night-8)' : '#3d3f4f',
        fontWeight: active || strong ? 600 : 500,
        position: 'relative',
      }}
    >
      {icon}
      {!collapsed && (
        <Text size={small ? 'xs' : 'sm'} fw="inherit" style={{ flex: 1 }}>
          {label}
        </Text>
      )}
      {badge !== undefined &&
        (collapsed ? (
          <Box pos="absolute" top={4} right={8} w={8} h={8} bg="night.6" style={{ borderRadius: 8 }} />
        ) : (
          <Badge size="sm" circle color="night">
            {badge}
          </Badge>
        ))}
    </UnstyledButton>
  );
  return collapsed ? (
    <Tooltip label={label} position="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}
