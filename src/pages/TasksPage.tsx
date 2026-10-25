import { Badge, Button, Group, Select, Tabs, TextInput } from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TaskTable } from '@/components/domain/TaskTable';
import { EmptyState, PageHeader, PageSkeleton } from '@/components/ui';
import { type Task, taskPriority, taskStatus } from '@/core';
import { useSimulatedLoading } from '@/lib/useSimulatedLoading';
import { useStore } from '@/store';
import { useUi } from '@/store/ui';

type View = 'all' | 'validate' | 'blocked' | 'done';

const views: Record<View, { label: string; filter: (t: Task) => boolean }> = {
  all: { label: 'Toutes', filter: (t) => t.status !== 'done' },
  validate: { label: 'À valider', filter: (t) => t.needsMyValidation && t.status === 'awaiting_validation' },
  blocked: { label: 'Bloquées', filter: (t) => t.status === 'blocked' },
  done: { label: 'Terminées', filter: (t) => t.status === 'done' },
};

export default function TasksPage() {
  const loading = useSimulatedLoading();
  const tasks = useStore((s) => s.tasks);
  const agents = useStore((s) => s.agents);
  const projects = useStore((s) => s.projects);
  const { openModal, openTask } = useUi();
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') as View) || 'all';
  const [q, setQ] = useState('');
  const [agent, setAgent] = useState<string | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const project = params.get('projet');
  const setProject = (v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set('projet', v);
    else next.delete('projet');
    setParams(next, { replace: true });
  };

  // Lien profond ?task=… : ouvre directement la modale de détail.
  useEffect(() => {
    const id = params.get('task');
    if (id) {
      openTask(id);
      params.delete('task');
      setParams(params, { replace: true });
    }
  }, [params, setParams, openTask]);

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          views[view].filter(t) &&
          (!q || t.title.toLowerCase().includes(q.toLowerCase())) &&
          (!agent || t.agentId === agent) &&
          (!priority || t.priority === priority) &&
          (!status || t.status === status) &&
          (!project || t.projectId === project),
      ),
    [tasks, view, q, agent, priority, status, project],
  );

  if (loading) return <PageSkeleton cards={0} rows={8} />;

  const reset = () => {
    setQ('');
    setAgent(null);
    setPriority(null);
    setStatus(null);
    setProject(null);
  };

  return (
    <>
      <PageHeader
        title="Tâches et validations"
        description="Les tâches de tous vos projets et ce qui attend votre décision."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => openModal('task', { projectId: project ?? undefined })}>
            Créer une tâche
          </Button>
        }
      />
      <Tabs value={view} onChange={(v) => {
          const next = new URLSearchParams(params);
          if (v && v !== 'all') next.set('view', v);
          else next.delete('view');
          setParams(next);
        }} mb="md">
        <Tabs.List>
          {(Object.keys(views) as View[]).map((v) => {
            const n = tasks.filter(views[v].filter).length;
            return (
              <Tabs.Tab key={v} value={v} rightSection={<Badge size="xs" variant={v === 'validate' && n ? 'filled' : 'light'} color={v === 'blocked' && n ? 'red' : 'night'} circle>{n}</Badge>}>
                {views[v].label}
              </Tabs.Tab>
            );
          })}
        </Tabs.List>
      </Tabs>
      <Group mb="md" gap="sm" wrap="wrap">
        <TextInput placeholder="Rechercher une tâche" leftSection={<IconSearch size={16} />} value={q} onChange={(e) => setQ(e.currentTarget.value)} w={{ base: '100%', sm: 240 }} />
        <Select placeholder="Agent" clearable data={agents.map((a) => ({ value: a.id, label: a.name }))} value={agent} onChange={setAgent} w={140} />
        <Select placeholder="Priorité" clearable data={Object.entries(taskPriority).map(([value, m]) => ({ value, label: m.label }))} value={priority} onChange={setPriority} w={140} />
        <Select placeholder="Statut" clearable data={Object.entries(taskStatus).map(([value, m]) => ({ value, label: m.label }))} value={status} onChange={setStatus} w={150} />
        <Select placeholder="Projet" clearable data={projects.map((p) => ({ value: p.id, label: p.name }))} value={project} onChange={setProject} w={230} />
      </Group>
      <TaskTable
        tasks={filtered}
        empty={
          <EmptyState
            title={view === 'validate' ? 'Rien à valider' : 'Aucune tâche'}
            description={view === 'validate' ? 'Toutes les validations sont à jour.' : 'Aucune tâche ne correspond à ces filtres.'}
            action={
              <Button variant="light" onClick={reset}>
                Réinitialiser les filtres
              </Button>
            }
          />
        }
      />
    </>
  );
}
