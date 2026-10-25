import { Outlet, Route, Routes } from 'react-router-dom';
import type { ProjectModule } from '@/core';
import { AppLayout } from '@/components/layout/AppLayout';
import { DataGate } from '@/components/layout/DataGate';
import { useProject } from '@/hooks/useProject';
import DashboardPage from '@/pages/DashboardPage';
import DiscussionsPage from '@/pages/DiscussionsPage';
import TasksPage from '@/pages/TasksPage';
import FinancePage from '@/pages/FinancePage';
import AgentsPage from '@/pages/AgentsPage';
import SettingsPage from '@/pages/SettingsPage';
import ProjectHomePage from '@/pages/ProjectHomePage';
import RestaurantsPage from '@/pages/RestaurantsPage';
import RestaurantDetailPage from '@/pages/RestaurantDetailPage';
import SiteProductionPage from '@/pages/SiteProductionPage';
import CommunicationPage from '@/pages/CommunicationPage';
import ContentDetailPage from '@/pages/ContentDetailPage';
import NotFoundPage from '@/pages/NotFoundPage';
import DraftPage from '@/pages/DraftPage';
import NewDraftPage from '@/pages/NewDraftPage';

/** Vérifie que le projet existe et, si demandé, qu'il possède le module. */
function ProjectGuard({ module }: { module?: ProjectModule }) {
  const project = useProject();
  if (!project) return <NotFoundPage what="Ce projet" />;
  if (module && !project.modules.includes(module)) return <NotFoundPage what={`Cette section du projet ${project.name}`} />;
  return <Outlet />;
}

export default function App() {
  return (
    <DataGate>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="discussions" element={<DiscussionsPage />} />
          <Route path="discussions/:threadId" element={<DiscussionsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="settings" element={<SettingsPage />} />

          <Route path="p/:projectId" element={<ProjectGuard />}>
            <Route index element={<ProjectHomePage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route element={<ProjectGuard module="restaurants" />}>
              <Route path="restaurants" element={<RestaurantsPage />} />
              <Route path="restaurants/:restaurantId" element={<RestaurantDetailPage />} />
            </Route>
            <Route element={<ProjectGuard module="production" />}>
              <Route path="production" element={<SiteProductionPage />} />
              <Route path="production/nouveau" element={<NewDraftPage />} />
              <Route path="production/:draftId" element={<DraftPage />} />
            </Route>
            <Route element={<ProjectGuard module="communication" />}>
              <Route path="communication" element={<CommunicationPage />} />
              <Route path="communication/:contentId" element={<ContentDetailPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </DataGate>
  );
}
