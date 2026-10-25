import { ActionIcon, Badge, Box, Button, Card, Chip, Grid, Group, SegmentedControl, Select, SimpleGrid, Stack, Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core';
import { IconBulb, IconCalendarEvent, IconChevronLeft, IconChevronRight, IconPlus, IconSearch, IconSparkles, IconUsersGroup, IconVideo } from '@tabler/icons-react';
import type { Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState, NetworkIcon, PageHeader, PageSkeleton, SectionCard, StatusBadge } from '@/components/ui';
import { capitalize, type Content, contentStatus, type ContentStatus, dayjs, fmtDate, fmtDateTime, formatLabel, type Network, networkLabel, nextMonday, originLabel, paths, today } from '@/core';
import { useProject } from '@/hooks/useProject';
import { useSimulatedLoading } from '@/lib/useSimulatedLoading';
import { useStore } from '@/store';
import { useUi } from '@/store/ui';

type View = 'week' | 'month' | 'list';

const statusBorder: Partial<Record<ContentStatus, string>> = {
  topic_review: 'var(--mantine-color-night-5)',
  visual_review: 'var(--mantine-color-night-5)',
  error: 'var(--mantine-color-red-6)',
  published: 'var(--mantine-color-sage-5)',
  scheduled: 'var(--mantine-color-blue-5)',
};

interface Piste {
  id: string;
  title: string;
  reason: string;
  meeting?: boolean;
}

/** Pistes proposées par l'agent communication, par projet (données de démonstration). */
const initialPistes: Record<string, Piste[]> = {
  yumco: [
    { id: 'y1', title: 'Série « Un producteur, un restaurant »', reason: 'Issue de la réunion éditoriale', meeting: true },
    { id: 'y2', title: 'Avant / après du menu digital de Sakura Ramen', reason: 'Sujet peu abordé : la vente à emporter' },
    { id: 'y3', title: 'Les 5 questions à se poser avant de créer son site', reason: 'Tendance observée sur LinkedIn' },
  ],
  argos: [
    { id: 'a1', title: 'Les coulisses du projet en 3 photos', reason: 'Format qui humanise un lancement' },
    { id: 'a2', title: 'Questions fréquentes sur Argos AI', reason: 'Sujet peu abordé' },
  ],
  diagnoskin: [
    { id: 'd1', title: 'Mythe ou réalité ? (format vidéo court)', reason: 'Tendance observée sur TikTok' },
    { id: 'd2', title: 'Présentation de l’équipe', reason: 'Sujet peu abordé' },
  ],
};

export default function CommunicationPage() {
  const loading = useSimulatedLoading();
  const project = useProject()!;
  const allContents = useStore((s) => s.contents);
  const contents = useMemo(() => allContents.filter((c) => c.projectId === project.id), [allContents, project.id]);
  const meetings = useStore((s) => s.meetings);
  const openModal = useUi((s) => s.openModal);
  const navigate = useNavigate();
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState(today());
  const [networks, setNetworks] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [dismissed, setDismissed] = useState<string[]>([]);
  const pistes = (initialPistes[project.id] ?? []).filter((p) => !dismissed.includes(p.id));
  const dismiss = (id: string) => setDismissed((d) => [...d, id]);

  const filtered = useMemo(
    () =>
      contents.filter(
        (c) =>
          (!networks.length || c.networks.some((n) => networks.includes(n))) &&
          (!status || c.status === status) &&
          (!format || c.format === format) &&
          (!q || c.title.toLowerCase().includes(q.toLowerCase())),
      ),
    [contents, networks, status, format, q],
  );

  if (loading) return <PageSkeleton cards={3} />;

  const monday = dayjs(nextMonday(12));
  const mondayProposal = contents.filter((c) => dayjs(c.scheduledAt).isSame(monday, 'day'));
  const nextEdito = meetings
    .filter((m) => (m.projectId === project.id || m.projectId === null) && m.status !== 'done')
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const unit = view === 'month' ? 'month' : 'week';
  const start = view === 'month' ? anchor.startOf('month').startOf('isoWeek') : anchor.startOf('isoWeek');
  const days = Array.from({ length: view === 'month' ? 42 : 7 }, (_, i) => start.add(i, 'day'));
  const periodLabel =
    view === 'month'
      ? capitalize(anchor.format('MMMM YYYY'))
      : `Semaine du ${start.format('D MMM')} au ${start.add(6, 'day').format('D MMM YYYY')}`;

  const forDay = (d: Dayjs) => filtered.filter((c) => dayjs(c.scheduledAt).isSame(d, 'day')).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const filtersActive = networks.length || status || format || q;

  return (
    <>
      <PageHeader
        title={`Communication — ${project.name}`}
        description="Pilotage éditorial des réseaux sociaux : chaque publication est validée avant programmation."
        actions={
          <Button leftSection={<IconBulb size={16} />} onClick={() => openModal('idea', { projectId: project.id })}>
            Nouvelle idée
          </Button>
        }
      />

      <Grid gutter="md">
        <Grid.Col span={12}>
          <Card padding="md">
            <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
              <Group gap="xs" wrap="nowrap">
                {view !== 'list' && (
                  <>
                    <ActionIcon variant="default" onClick={() => setAnchor((a) => a.subtract(1, unit))} aria-label="Période précédente">
                      <IconChevronLeft size={16} />
                    </ActionIcon>
                    <Button variant="default" size="xs" onClick={() => setAnchor(today())}>
                      Aujourd’hui
                    </Button>
                    <ActionIcon variant="default" onClick={() => setAnchor((a) => a.add(1, unit))} aria-label="Période suivante">
                      <IconChevronRight size={16} />
                    </ActionIcon>
                  </>
                )}
                <Text fw={600} ml={4}>
                  {view === 'list' ? `${filtered.length} contenus` : periodLabel}
                </Text>
              </Group>
              <SegmentedControl
                size="xs"
                value={view}
                onChange={(v) => setView(v as View)}
                data={[
                  { value: 'week', label: 'Semaine' },
                  { value: 'month', label: 'Mois' },
                  { value: 'list', label: 'Liste' },
                ]}
              />
            </Group>

            <Group gap="sm" mb="md" wrap="wrap">
              <TextInput size="xs" placeholder="Rechercher" leftSection={<IconSearch size={14} />} value={q} onChange={(e) => setQ(e.currentTarget.value)} w={180} />
              <Chip.Group multiple value={networks} onChange={setNetworks}>
                <Group gap={6}>
                  {(Object.keys(networkLabel) as Network[]).map((n) => (
                    <Chip key={n} value={n} size="xs" variant="outline">
                      {networkLabel[n]}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
              <Select size="xs" placeholder="Statut" clearable data={Object.entries(contentStatus).map(([value, m]) => ({ value, label: m.label }))} value={status} onChange={setStatus} w={160} />
              <Select size="xs" placeholder="Format" clearable data={Object.entries(formatLabel).map(([value, label]) => ({ value, label }))} value={format} onChange={setFormat} w={130} />
              {filtersActive ? (
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={() => {
                    setNetworks([]);
                    setStatus(null);
                    setFormat(null);
                    setQ('');
                  }}
                >
                  Effacer
                </Button>
              ) : null}
            </Group>

            {view === 'list' ? (
              <ContentList items={filtered} />
            ) : (
              <Box className="scroll-x">
                <SimpleGrid cols={7} spacing={6} miw={view === 'week' ? 840 : 700} verticalSpacing={6}>
                  {days.slice(0, 7).map((d) => (
                    <Text key={`h-${d.format()}`} size="xs" c="dimmed" fw={600} tt="uppercase" ta="center">
                      {d.format('ddd')}
                    </Text>
                  ))}
                  {days.map((d) => {
                    const items = forDay(d);
                    const isToday = d.isSame(today(), 'day');
                    const outside = view === 'month' && !d.isSame(anchor, 'month');
                    return (
                      <Box
                        key={d.format()}
                        p={6}
                        mih={view === 'week' ? 300 : 96}
                        style={{
                          background: isToday ? 'var(--mantine-color-night-0)' : outside ? 'transparent' : 'var(--app-surface-2)',
                          borderRadius: 8,
                          border: '1px solid var(--app-border)',
                          opacity: outside ? 0.5 : 1,
                        }}
                      >
                        <Group justify="space-between" mb={6} wrap="nowrap">
                          <Text size="sm" fw={isToday ? 700 : 500} c={isToday ? 'night.7' : undefined}>
                            {d.format('D')}
                            {view === 'week' && (
                              <Text span size="xs" c="dimmed" ml={4}>
                                {d.format('MMM')}
                              </Text>
                            )}
                          </Text>
                          <Tooltip label="Nouvelle idée ce jour-là">
                            <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => openModal('idea', { projectId: project.id, date: d.toISOString() })} aria-label="Ajouter">
                              <IconPlus size={12} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                        <Stack gap={4}>
                          {items.map((c) =>
                            view === 'week' ? (
                              <WeekItem key={c.id} c={c} onClick={() => navigate(paths.content(project.id, c.id))} />
                            ) : (
                              <UnstyledButton
                                key={c.id}
                                onClick={() => navigate(paths.content(project.id, c.id))}
                                px={6}
                                py={2}
                                style={{ borderRadius: 4, background: '#fff', borderLeft: `3px solid ${statusBorder[c.status] ?? 'var(--mantine-color-gray-4)'}` }}
                              >
                                <Text size="xs" truncate>
                                  {c.title}
                                </Text>
                              </UnstyledButton>
                            ),
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
                </SimpleGrid>
                {!days.some((d) => forDay(d).length) && (
                  <EmptyState compact title="Aucun contenu sur cette période" description={filtersActive ? 'Aucun contenu ne correspond aux filtres.' : 'Ajoutez une idée ou changez de période.'} />
                )}
              </Box>
            )}
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <SectionCard title={`Proposition du lundi ${monday.format('D MMM')}`} subtitle="Préparée automatiquement par l’agent" icon={<IconSparkles size={18} />}>
              {mondayProposal.length ? (
                <Stack gap="sm">
                  {mondayProposal.map((c) => (
                    <UnstyledButton key={c.id} component={Link} to={paths.content(c.projectId, c.id)} p="sm" style={{ border: '1px solid var(--app-border)', borderRadius: 10 }}>
                      <Text size="sm" fw={600}>
                        {c.title}
                      </Text>
                      <Group gap={6} mt={6}>
                        <StatusBadge meta={contentStatus[c.status]} size="xs" />
                        {c.origin.type === 'meeting' && (
                          <Badge size="xs" variant="light" color="grape" tt="none" leftSection={<IconUsersGroup size={10} />}>
                            Décidé en réunion
                          </Badge>
                        )}
                      </Group>
                    </UnstyledButton>
                  ))}
                </Stack>
              ) : (
                <EmptyState compact title="Pas encore de proposition" />
              )}
            </SectionCard>

            <SectionCard title="Prochaine réunion" icon={<IconCalendarEvent size={18} />}>
              {nextEdito ? (
                <Stack gap={6}>
                  <Text size="sm" fw={500}>
                    {nextEdito.title}
                  </Text>
                  <Text size="sm" fw={600}>
                    {fmtDateTime(nextEdito.date)}
                  </Text>
                  {nextEdito.agenda.map((a) => (
                    <Text key={a} size="xs" c="dimmed">
                      • {a}
                    </Text>
                  ))}
                  <Button size="xs" variant="light" mt={6} component={Link} to={paths.discussions(nextEdito.id)}>
                    Ouvrir la réunion
                  </Button>
                </Stack>
              ) : (
                <EmptyState compact title="Aucune réunion planifiée" action={<Button size="xs" variant="light" onClick={() => openModal('meeting', { projectId: project.id })}>Planifier</Button>} />
              )}
            </SectionCard>

            <SectionCard title="Pistes proposées par l’agent" icon={<IconBulb size={18} />}>
              {pistes.length ? (
                <Stack gap="sm">
                  {pistes.map((p) => (
                    <Box key={p.id} p="sm" style={{ background: 'var(--app-surface-2)', borderRadius: 10 }}>
                      <Text size="sm" fw={500}>
                        {p.title}
                      </Text>
                      <Text size="xs" c={p.meeting ? 'grape.7' : 'dimmed'}>
                        {p.reason}
                      </Text>
                      <Group gap={6} mt={6}>
                        <Button
                          size="compact-xs"
                          variant="light"
                          onClick={() => {
                            openModal('idea', { projectId: project.id, title: p.title });
                            dismiss(p.id);
                          }}
                        >
                          Retenir
                        </Button>
                        <Button size="compact-xs" variant="subtle" color="gray" onClick={() => dismiss(p.id)}>
                          Écarter
                        </Button>
                      </Group>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <EmptyState compact title="Toutes les pistes ont été traitées" description="L’agent en proposera de nouvelles lundi." />
              )}
            </SectionCard>
          </SimpleGrid>
        </Grid.Col>
      </Grid>
    </>
  );
}

function WeekItem({ c, onClick }: { c: Content; onClick: () => void }) {
  return (
    <UnstyledButton
      onClick={onClick}
      p={8}
      className="hover-lift"
      style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--app-border)', borderLeft: `3px solid ${statusBorder[c.status] ?? 'var(--mantine-color-gray-4)'}` }}
    >
      <Text size="xs" c="dimmed">
        {dayjs(c.scheduledAt).format('HH:mm')} · {formatLabel[c.format]}
      </Text>
      <Text size="xs" fw={600} lineClamp={3} my={4}>
        {c.title}
      </Text>
      <Group gap={3} mb={6}>
        {c.networks.map((n) => (
          <NetworkIcon key={n} network={n} size={18} />
        ))}
      </Group>
      <StatusBadge meta={contentStatus[c.status]} size="xs" />
    </UnstyledButton>
  );
}

function ContentList({ items }: { items: Content[] }) {
  if (!items.length) return <EmptyState title="Aucun contenu" description="Aucun contenu ne correspond aux filtres." />;
  return (
    <Stack gap="xs">
      {[...items]
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
        .map((c) => (
          <UnstyledButton key={c.id} component={Link} to={paths.content(c.projectId, c.id)} p="sm" className="hover-lift" style={{ border: '1px solid var(--app-border)', borderRadius: 10, background: '#fff' }}>
            <Group justify="space-between" wrap="wrap" gap="sm">
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                {c.format === 'video' ? <IconVideo size={18} /> : null}
                <div style={{ minWidth: 0 }}>
                  <Text size="sm" fw={600} truncate>
                    {c.title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {fmtDate(c.scheduledAt)} · {formatLabel[c.format]} · {originLabel[c.origin.type]}
                  </Text>
                </div>
              </Group>
              <Group gap={6}>
                {c.networks.map((n) => (
                  <NetworkIcon key={n} network={n} />
                ))}
                <StatusBadge meta={contentStatus[c.status]} />
              </Group>
            </Group>
          </UnstyledButton>
        ))}
    </Stack>
  );
}

