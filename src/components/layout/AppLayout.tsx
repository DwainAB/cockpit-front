import { AppShell, Box } from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { GlobalSearch } from './GlobalSearch';
import { GlobalModals } from '@/components/modals/GlobalModals';

export function AppLayout() {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const [collapsed, setCollapsed] = useLocalStorage({ key: 'cockpit-sidebar-collapsed', defaultValue: false });
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: collapsed ? 72 : 248, breakpoint: 'sm', collapsed: { mobile: !mobileOpened } }}
      padding={0}
      styles={{
        navbar: { background: '#fbfaf7', borderColor: 'var(--app-border)', transition: 'width 180ms ease' },
        header: { background: 'rgba(247,245,241,0.88)', backdropFilter: 'blur(8px)', borderColor: 'var(--app-border)' },
        main: { background: 'var(--app-bg)' },
      }}
    >
      <AppShell.Header>
        <Topbar mobileOpened={mobileOpened} toggleMobile={toggleMobile} />
      </AppShell.Header>
      <AppShell.Navbar>
        <Sidebar collapsed={collapsed && !mobileOpened} onToggle={() => setCollapsed((c) => !c)} onNavigate={closeMobile} />
      </AppShell.Navbar>
      <AppShell.Main>
        <Box px={{ base: 16, sm: 24, lg: 36 }} py={{ base: 20, sm: 28 }} maw={1480} mx="auto">
          <Outlet />
        </Box>
      </AppShell.Main>
      <GlobalSearch />
      <GlobalModals />
    </AppShell>
  );
}
