import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Drawer,
  Tabs,
  Grid,
  Group,
  Loader,
  Menu,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure, useInterval } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCheck,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDots,
  IconExternalLink,
  IconForms,
  IconRefresh,
  IconSparkles,
  IconTrash,
  IconWand,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { buildStatus, currentBuild, designStatus, fmtDateTime, paths, usd, type DesignVersion, type SiteDraft } from '@/core';
import { api } from '@/api';
import { assetUrl } from '@/api/http';
import { QuestionnaireSummary } from '@/components/domain/QuestionnaireSummary';
import { BuildPanel } from '@/components/drafts/BuildPanel';
import { PageHeader, SectionCard, StatusBadge } from '@/components/ui';
import { notifySuccess } from '@/lib/notify';
import { useStore } from '@/store';
import NotFoundPage from './NotFoundPage';

const QUICK_REASONS = ['Couleurs', 'Typographie', 'Mise en page', 'Images', 'Textes', 'Trop chargé', 'Pas assez original'];

/** Aperçu du design généré, validation et régénération avec remarque. */
export default function DraftPage() {
  const { draftId } = useParams();
  const draft = useStore((s) => s.drafts.find((d) => d.id === draftId));
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [questionnaireOpened, questionnaire] = useDisclosure(false);

  const latest = draft?.versions.at(-1);
  const build = draft ? currentBuild(draft) : undefined;
  const [tab, setTab] = useState<string>('maquette');
  // Une nouvelle version s'affiche automatiquement dès qu'elle apparaît.
  useEffect(() => setSelectedId(latest?.id ?? null), [latest?.id]);
  // Dès que le développement démarre, on bascule sur l'onglet du site.
  useEffect(() => setTab(build ? 'site' : 'maquette'), [build?.id]);

  if (!draft || !latest) return <NotFoundPage what="Cette maquette" />;
  const selected = draft.versions.find((v) => v.id === selectedId) ?? latest;
  const totalCost = draft.versions.reduce((s, v) => s + (v.usage?.costUsd ?? 0), 0);

  return (
    <>
      <Anchor component={Link} to={paths.production()} size="sm" c="dimmed" mb="xs" display="inline-flex" style={{ alignItems: 'center', gap: 4 }}>
        <IconArrowLeft size={14} /> Production des sites
      </Anchor>
      <PageHeader
        eyebrow={<StatusBadge meta={build ? buildStatus[build.status] : designStatus[latest.status]} />}
        title={draft.answers.name}
        description={`${draft.answers.restaurantType} · questionnaire du ${fmtDateTime(draft.createdAt)}`}
        actions={
          <>
            <Button variant="default" leftSection={<IconForms size={16} />} onClick={questionnaire.open}>
              Questionnaire
            </Button>
            <Menu position="bottom-end">
              <Menu.Target>
                <Button variant="default" px="xs" aria-label="Plus d’actions">
                  <IconDots size={18} />
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={async () => {
                    await api.drafts.remove(draft.id);
                    notifySuccess('Maquette supprimée', draft.answers.name);
                    navigate(paths.production());
                  }}
                >
                  Supprimer cette maquette
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </>
        }
      />

      <Tabs value={tab} onChange={(v) => setTab(v ?? 'maquette')} keepMounted={false}>
        {build && (
          <Tabs.List mb="md">
            <Tabs.Tab value="maquette">Maquette</Tabs.Tab>
            <Tabs.Tab value="site" rightSection={<StatusBadge meta={buildStatus[build.status]} size="xs" />}>
              Site développé
            </Tabs.Tab>
          </Tabs.List>
        )}
        <Tabs.Panel value="site">{build && <BuildPanel draft={draft} />}</Tabs.Panel>
        <Tabs.Panel value="maquette">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <Card padding={0}>
                <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid var(--app-border)' }} wrap="wrap" gap="xs">
                  <Group gap="xs">
                    <Text size="sm" fw={600}>
                      Version {selected.number}
                    </Text>
                    {selected.id !== latest.id && (
                      <Badge variant="light" color="gray" tt="none">
                        Ancienne version
                      </Badge>
                    )}
                    {selected.simulated && (
                      <Badge variant="light" color="orange" tt="none">
                        Aperçu simulé
                      </Badge>
                    )}
                  </Group>
                  <Group gap="xs">
                    <SegmentedControl
                      size="xs"
                      value={device}
                      onChange={(v) => setDevice(v as typeof device)}
                      data={[
                        { value: 'desktop', label: <IconDeviceDesktop size={16} aria-label="Ordinateur" /> },
                        { value: 'mobile', label: <IconDeviceMobile size={16} aria-label="Mobile" /> },
                      ]}
                    />
                    {selected.previewUrl && (
                      <Tooltip label="Ouvrir l’aperçu dans un nouvel onglet">
                        <Button size="xs" variant="subtle" component="a" href={assetUrl(selected.previewUrl)} target="_blank" rel="noopener" px={8}>
                          <IconExternalLink size={16} />
                        </Button>
                      </Tooltip>
                    )}
                  </Group>
                </Group>
                <Preview version={selected} device={device} />
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Stack gap="md">
                <ActionsCard draft={draft} latest={latest} />

                {selected.concept && (
                  <SectionCard title={selected.concept.name} subtitle="Direction artistique" icon={<IconSparkles size={18} />}>
                    <Text size="sm">{selected.concept.summary}</Text>
                    <Group gap={6} mt="sm">
                      {selected.concept.palette.map((c) => (
                        <Tooltip key={c} label={c}>
                          <Box w={26} h={26} style={{ borderRadius: 6, background: c, border: '1px solid var(--app-border)' }} />
                        </Tooltip>
                      ))}
                    </Group>
                    <Text size="xs" c="dimmed" mt="sm">
                      Titres : {selected.concept.fonts.heading} · Texte : {selected.concept.fonts.body}
                    </Text>
                  </SectionCard>
                )}

                {selected.notes.length > 0 && (
                  <Alert variant="light" color="yellow" icon={<IconAlertTriangle size={18} />} title="Points d’attention de l’agent">
                    <Stack gap={4}>
                      {selected.notes.map((n) => (
                        <Text key={n} size="sm">
                          • {n}
                        </Text>
                      ))}
                    </Stack>
                  </Alert>
                )}

                {selected.contrasts && selected.contrasts.length > 0 && (
              <SectionCard
                title="Accessibilité des couleurs"
                subtitle={`${selected.contrasts.filter((c) => c.passed).length}/${selected.contrasts.length} contrastes conformes (WCAG AA)`}
              >
                <Stack gap={6}>
                  {selected.contrasts.map((c) => (
                    <Group key={`${c.usage}-${c.text}-${c.background}`} justify="space-between" wrap="nowrap" gap="xs">
                      <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                        <Box px={6} py={2} style={{ background: c.background, color: c.text, borderRadius: 4, border: '1px solid var(--app-border)', fontSize: 12, fontWeight: 600 }}>
                          Aa
                        </Box>
                        <Text size="xs" truncate>
                          {c.usage}
                        </Text>
                      </Group>
                      <Badge size="xs" variant="light" color={c.passed ? 'sage' : 'red'} tt="none">
                        {c.ratio}:1
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              </SectionCard>
            )}

            <SectionCard title="Versions" subtitle={totalCost > 0 ? `Coût total estimé : ${usd(totalCost)}` : undefined}>
                  <Stack gap={4}>
                    {[...draft.versions].reverse().map((v) => (
                      <UnstyledButton
                        key={v.id}
                        onClick={() => setSelectedId(v.id)}
                        p="xs"
                        style={{ borderRadius: 8, background: v.id === selected.id ? 'var(--mantine-color-night-0)' : undefined }}
                      >
                        <Group justify="space-between" wrap="nowrap" gap="xs">
                          <Text size="sm" fw={600}>
                            v{v.number}
                          </Text>
                          <StatusBadge meta={designStatus[v.status]} size="xs" />
                        </Group>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {v.feedback
                            ? `${v.fresh ? 'Nouvelle proposition' : 'Modification'} : « ${v.feedback} »`
                            : v.fresh && v.number > 1
                              ? 'Nouvelle proposition'
                              : 'Première proposition'}
                        </Text>
                        <Text size="10px" c="dimmed">
                          {fmtDateTime(v.createdAt)}
                          {v.usage && ` · ${usd(v.usage.costUsd)} · ${v.usage.model}`}
                        </Text>
                      </UnstyledButton>
                    ))}
                  </Stack>
                </SectionCard>
              </Stack>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>
      </Tabs>

      <Drawer opened={questionnaireOpened} onClose={questionnaire.close} position="right" size="lg" title="Questionnaire">
        <QuestionnaireSummary answers={draft.answers} plan={draft.plan} />
      </Drawer>
    </>
  );
}

function Preview({ version, device }: { version: DesignVersion; device: 'desktop' | 'mobile' }) {
  if (version.status === 'queued' || version.status === 'generating') return <Generating since={version.createdAt} queued={version.status === 'queued'} />;
  if (version.status === 'failed')
    return (
      <Box p="xl" mih={420}>
        <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />} title="La génération a échoué">
          {version.error}
        </Alert>
      </Box>
    );
  // Le code est généré par une IA : il s'affiche dans un cadre isolé, sans exécution de script.
  return (
    <Box bg="var(--app-surface-2)" p={device === 'mobile' ? 'md' : 0} style={{ display: 'flex', justifyContent: 'center' }}>
      <iframe
        key={version.id}
        title={`Aperçu de la version ${version.number}`}
        sandbox="allow-same-origin"
        src={version.previewUrl ? assetUrl(version.previewUrl) : undefined}
        srcDoc={version.previewUrl ? undefined : version.html}
        style={{
          width: device === 'mobile' ? 390 : '100%',
          height: 'calc(100dvh - 230px)',
          minHeight: 560,
          border: device === 'mobile' ? '1px solid var(--app-border)' : 0,
          borderRadius: device === 'mobile' ? 24 : 0,
          background: '#fff',
          display: 'block',
        }}
      />
    </Box>
  );
}

function Generating({ since, queued }: { since: string; queued: boolean }) {
  const [now, setNow] = useState(Date.now());
  const interval = useInterval(() => setNow(Date.now()), 1000);
  useEffect(() => {
    interval.start();
    return interval.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const seconds = Math.max(0, Math.round((now - new Date(since).getTime()) / 1000));
  return (
    <Stack align="center" justify="center" mih={520} gap="sm" p="xl" ta="center">
      <Loader />
      <Text fw={600}>{queued ? 'En attente de prise en charge par l’agent webdesign…' : 'L’agent webdesign prépare la maquette…'}</Text>
      <Text size="sm" c="dimmed">
        Cela prend généralement 1 à 3 minutes. Vous pouvez retourner sur Production des sites : la fiche passera dans « Maquette à valider » automatiquement.
      </Text>
      <Text size="xs" c="dimmed">
        {Math.floor(seconds / 60)} min {String(seconds % 60).padStart(2, '0')} s
      </Text>
    </Stack>
  );
}

/** Décision sur la dernière version : valider, ou régénérer avec une remarque. */
function ActionsCard({ draft, latest }: { draft: SiteDraft; latest: DesignVersion }) {
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState<null | 'validate' | 'modify' | 'fresh'>(null);

  const regenerate = async (fresh: boolean) => {
    setBusy(fresh ? 'fresh' : 'modify');
    try {
      await api.drafts.regenerate(draft.id, { feedback: feedback.trim() || undefined, fresh });
      setFeedback('');
      notifySuccess(fresh ? 'Nouvelle proposition demandée' : 'Modification demandée', 'La maquette repasse en préparation.');
    } finally {
      setBusy(null);
    }
  };

  if (latest.status === 'validated')
    return (
      <Alert color="sage" variant="light" icon={<IconCheck size={18} />} title={`Maquette v${latest.number} validée`}>
        Le site est développé à partir de cette maquette : suivez l’avancement dans l’onglet « Site développé ».
      </Alert>
    );
  if (latest.status === 'generating' || latest.status === 'queued')
    return (
      <Card>
        <Group gap="sm">
          <Loader size="sm" />
          <Text size="sm">{latest.status === 'queued' ? `Version ${latest.number} en attente…` : `Version ${latest.number} en préparation…`}</Text>
        </Group>
      </Card>
    );

  return (
    <Card>
      <Stack gap="sm">
        {latest.status === 'ready' ? (
          <>
            <Text fw={650}>Cette maquette vous convient ?</Text>
            <Button
              color="sage"
              leftSection={<IconCheck size={16} />}
              loading={busy === 'validate'}
              onClick={async () => {
                setBusy('validate');
                try {
                  await api.drafts.validate(draft.id, latest.id);
                  notifySuccess('Maquette validée', `${draft.answers.name} — version ${latest.number}.`);
                } finally {
                  setBusy(null);
                }
              }}
            >
              Valider la maquette
            </Button>
          </>
        ) : (
          <Text fw={650}>Relancer la génération</Text>
        )}

        <Text size="sm" fw={500} mt="xs">
          {latest.status === 'failed' ? 'Indication pour la nouvelle tentative (facultatif)' : 'Ce qui ne va pas'}
        </Text>
        <Group gap={6}>
          {QUICK_REASONS.map((r) => (
            <Button key={r} size="compact-xs" variant="default" radius="xl" onClick={() => setFeedback((f) => (f.trim() ? `${f.trim()} ${r} :` : `${r} :`))}>
              {r}
            </Button>
          ))}
        </Group>
        <Textarea
          placeholder="Ex. : couleurs trop sombres, mettre la terrasse en avant, titre moins imposant…"
          autosize
          minRows={3}
          maxLength={2000}
          value={feedback}
          onChange={(e) => setFeedback(e.currentTarget.value)}
        />
        <Group grow>
          {latest.status !== 'failed' && (
            <Tooltip label="La maquette repasse en préparation et l’agent la modifie selon votre remarque">
              <Button
                variant="light"
                leftSection={<IconRefresh size={16} />}
                disabled={!feedback.trim()}
                loading={busy === 'modify'}
                onClick={() => regenerate(false)}
              >
                Régénérer
              </Button>
            </Tooltip>
          )}
          <Tooltip label="Repart de zéro avec une nouvelle direction artistique">
            <Button variant="default" leftSection={<IconWand size={16} />} loading={busy === 'fresh'} onClick={() => regenerate(true)}>
              {latest.status === 'failed' ? 'Relancer' : 'Nouvelle proposition'}
            </Button>
          </Tooltip>
        </Group>
        <Text size="xs" c="dimmed">
          Chaque génération est facturée par l’API Claude (coût estimé affiché dans les versions).
        </Text>
      </Stack>
    </Card>
  );
}
