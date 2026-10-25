import { Alert, Anchor, Badge, Box, Button, Card, Grid, Group, Loader, SimpleGrid, Stack, Stepper, Tabs, Text, Textarea, Timeline } from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowsShuffle,
  IconBulb,
  IconCalendarCheck,
  IconCheck,
  IconCircleCheck,
  IconEdit,
  IconPhoto,
  IconPlayerPlay,
  IconRefresh,
  IconSend,
  IconUsersGroup,
  IconVideo,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/api';
import { AgentChip, NetworkIcon, PageHeader, PageSkeleton, SectionCard, StatusBadge } from '@/components/ui';
import { type ContentAction, contentStatus, type ContentStatus, dayjs, fmtDateTime, formatLabel, networkLabel, originLabel, paths } from '@/core';
import { notifyError, notifyInfo, notifySuccess } from '@/lib/notify';
import { useProject } from '@/hooks/useProject';
import { useSimulatedLoading } from '@/lib/useSimulatedLoading';
import { useStore } from '@/store';
import NotFoundPage from './NotFoundPage';

const stepIndex: Record<ContentStatus, number> = {
  idea: 0,
  topic_review: 0,
  preparing: 1,
  visual_review: 1,
  approved: 2,
  scheduled: 2,
  error: 2,
  published: 4,
};

const ratioToAspect = (r: string) => {
  const [w, h] = r.split(':').map(Number);
  return `${w} / ${h}`;
};

export default function ContentDetailPage() {
  const { contentId } = useParams();
  const loading = useSimulatedLoading(350);
  const project = useProject();
  const c = useStore((s) => s.contents.find((x) => x.id === contentId));
  const meeting = useStore((s) => s.meetings.find((m) => m.id === c?.origin.meetingId));
  const maxGen = useStore((s) => s.settings.budget.maxGenerationsPerContent);
  const [busy, setBusy] = useState<ContentAction | null>(null);
  const [changeMode, setChangeMode] = useState(false);
  const [comment, setComment] = useState('');

  if (loading) return <PageSkeleton cards={2} />;
  if (!c || c.projectId !== project?.id) return <NotFoundPage what="Ce contenu" />;

  const act = async (action: ContentAction, ok: [string, string?], fn = notifySuccess) => {
    if (action === 'request_changes' && !comment.trim()) return notifyError('Commentaire requis', 'Décrivez la modification attendue.');
    setBusy(action);
    await api.contents.act(c.id, action, comment.trim() || undefined).finally(() => setBusy(null));
    setChangeMode(false);
    setComment('');
    fn(...ok);
  };

  const imageNetworks = c.networks.filter((n) => n !== 'tiktok');
  const firstTab = c.networks[0];

  return (
    <>
      <PageHeader
        eyebrow={
          <Group gap="xs">
            <StatusBadge meta={contentStatus[c.status]} />
            <Badge variant="outline" color="gray" tt="none">
              {formatLabel[c.format]}
            </Badge>
            {c.networks.map((n) => (
              <NetworkIcon key={n} network={n} />
            ))}
          </Group>
        }
        title={c.title}
        description={`Publication souhaitée le ${fmtDateTime(c.scheduledAt)}`}
      />

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="md">
            <Card>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                Objectif du post
              </Text>
              <Text mt={4}>{c.objective || '—'}</Text>
              <Box mt="md" p="md" style={{ background: c.origin.type === 'meeting' ? 'var(--mantine-color-grape-0)' : 'var(--app-surface-2)', borderRadius: 10 }}>
                <Group gap={8} mb={4}>
                  {c.origin.type === 'meeting' ? <IconUsersGroup size={16} /> : <IconBulb size={16} />}
                  <Text size="sm" fw={600}>
                    Pourquoi ce sujet ? — {originLabel[c.origin.type]}
                  </Text>
                </Group>
                <Text size="sm">{c.origin.label}</Text>
                {meeting && (
                  <Anchor component={Link} to={paths.discussions(meeting.id)} size="sm" mt={4} display="inline-block">
                    Voir la réunion du {dayjs(meeting.date).format('D MMMM')} →
                  </Anchor>
                )}
              </Box>
            </Card>

            {c.masterVisual && (
              <SectionCard title="Visuel maître et déclinaisons" subtitle="Une image maître, adaptée pour Instagram, LinkedIn et Facebook" icon={<IconPhoto size={18} />}>
                <Grid gutter="md" align="stretch">
                  <Grid.Col span={{ base: 12, sm: 5 }}>
                    <Badge mb={6} variant="filled" color="night" tt="none">
                      Visuel maître
                    </Badge>
                    <MockVisual palette={c.masterVisual.palette} title={c.title} aspect="1 / 1" big />
                    <Text size="xs" c="dimmed" mt={6}>
                      {c.masterVisual.description}
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 7 }}>
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={6}>
                      Adaptations par réseau
                    </Text>
                    <SimpleGrid cols={3} spacing="sm">
                      {c.masterVisual.adaptations.map((a) => (
                        <div key={a.network}>
                          <MockVisual palette={c.masterVisual!.palette} title={c.title} aspect={ratioToAspect(a.ratio)} />
                          <Group gap={4} mt={6} wrap="nowrap">
                            <NetworkIcon network={a.network} size={18} />
                            <Text size="xs" fw={600}>
                              {a.ratio}
                            </Text>
                          </Group>
                          <Text size="xs" c="dimmed" lh={1.3}>
                            {a.note}
                          </Text>
                        </div>
                      ))}
                    </SimpleGrid>
                  </Grid.Col>
                </Grid>
              </SectionCard>
            )}

            {c.video && (
              <SectionCard title="Vidéo TikTok" subtitle="Format distinct — ne dérive pas du visuel maître" icon={<IconVideo size={18} />}>
                <Group align="flex-start" gap="lg" wrap="wrap">
                  <Box
                    w={150}
                    style={{ aspectRatio: '9 / 16', borderRadius: 14, background: 'linear-gradient(160deg,#1b1b22,#3a2c3f 60%,#B3433B)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                  >
                    <IconPlayerPlay size={36} color="white" />
                    <Text size="xs" c="white" pos="absolute" bottom={8} right={10}>
                      {c.video.duration}
                    </Text>
                  </Box>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <Text size="sm" fw={600}>
                      {c.video.title}
                    </Text>
                    <Text size="xs" c="dimmed" mb="sm">
                      Aperçu fictif, aucune vidéo réelle générée.
                    </Text>
                    <Timeline bulletSize={14} lineWidth={2}>
                      {c.video.script.map((s) => (
                        <Timeline.Item key={s}>
                          <Text size="sm">{s}</Text>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  </div>
                </Group>
              </SectionCard>
            )}

            {!c.masterVisual && !c.video && (
              <Card>
                <Text size="sm" c="dimmed">
                  Aucun visuel pour l’instant : il sera généré (simulation) après validation du sujet.
                </Text>
              </Card>
            )}

            <SectionCard title="Textes proposés par réseau" icon={<IconEdit size={18} />}>
              {firstTab ? (
                <Tabs defaultValue={firstTab} variant="pills">
                  <Tabs.List mb="md">
                    {c.networks.map((n) => (
                      <Tabs.Tab key={n} value={n} leftSection={<NetworkIcon network={n} size={18} />}>
                        {networkLabel[n]}
                      </Tabs.Tab>
                    ))}
                  </Tabs.List>
                  {c.networks.map((n) => (
                    <Tabs.Panel key={n} value={n}>
                      <Box p="md" style={{ background: 'var(--app-surface-2)', borderRadius: 10, whiteSpace: 'pre-line' }}>
                        <Text size="sm">{c.captions[n] ?? 'Texte en attente de génération (après validation du sujet).'}</Text>
                      </Box>
                      <Text size="xs" c="dimmed" mt={6}>
                        {n === 'tiktok' ? 'Accompagne la vidéo TikTok.' : `Accompagne l’adaptation ${networkLabel[n]} du visuel maître.`}
                      </Text>
                    </Tabs.Panel>
                  ))}
                </Tabs>
              ) : null}
            </SectionCard>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Stack gap="md">
            <Card>
              <Text fw={650} mb="md">
                Validation
              </Text>
              <Stepper active={stepIndex[c.status]} orientation="vertical" size="sm" color={c.status === 'error' ? 'red' : 'sage'}>
                <Stepper.Step label="Sujet" description={c.status === 'idea' ? 'À soumettre' : c.status === 'topic_review' ? 'En attente de votre validation' : 'Validé'} />
                <Stepper.Step label="Visuel" description={c.status === 'preparing' ? 'L’agent prépare le visuel…' : c.status === 'visual_review' ? 'En attente de votre validation' : stepIndex[c.status] > 1 ? 'Validé' : 'À venir'} />
                <Stepper.Step label="Programmation" description={c.status === 'scheduled' ? `Programmé pour le ${fmtDateTime(c.scheduledAt)}` : c.status === 'error' ? 'Échec de publication' : 'À venir'} />
                <Stepper.Step label="Publication" description={c.status === 'published' ? 'Publié (simulation)' : 'À venir'} />
              </Stepper>

              <Stack gap="sm" mt="lg">
                {c.status === 'idea' && (
                  <Button leftSection={<IconSend size={16} />} loading={busy === 'submit_topic'} onClick={() => act('submit_topic', ['Sujet soumis à validation'])}>
                    Soumettre le sujet à validation
                  </Button>
                )}
                {c.status === 'topic_review' && (
                  <>
                    <Button color="sage" leftSection={<IconCheck size={16} />} loading={busy === 'validate_topic'} onClick={() => act('validate_topic', ['Sujet validé', 'L’agent prépare le visuel (simulation).'])}>
                      Valider le sujet
                    </Button>
                    <Button variant="light" leftSection={<IconArrowsShuffle size={16} />} loading={busy === 'another_idea'} onClick={() => act('another_idea', ['Nouvelle idée proposée'], notifyInfo)}>
                      Demander une autre idée
                    </Button>
                  </>
                )}
                {c.status === 'preparing' && (
                  <Group gap="sm" p="sm" style={{ background: 'var(--app-surface-2)', borderRadius: 8 }}>
                    <Loader size="xs" />
                    <Text size="sm">L’agent communication prépare le visuel…</Text>
                  </Group>
                )}
                {c.status === 'visual_review' && (
                  <>
                    {changeMode && <Textarea autosize minRows={2} label="Modification attendue" placeholder="Ex. : photo plus lumineuse, titre plus court" value={comment} onChange={(e) => setComment(e.currentTarget.value)} />}
                    {changeMode ? (
                      <Group grow>
                        <Button color="orange" loading={busy === 'request_changes'} onClick={() => act('request_changes', ['Modification demandée', 'Une nouvelle version arrive (simulation).'])}>
                          Envoyer
                        </Button>
                        <Button variant="default" onClick={() => setChangeMode(false)}>
                          Annuler
                        </Button>
                      </Group>
                    ) : (
                      <>
                        <Button color="sage" leftSection={<IconCheck size={16} />} loading={busy === 'validate_visual'} onClick={() => act('validate_visual', ['Visuel validé', 'Programmé pour demain à 09:00.'])}>
                          Valider le visuel
                        </Button>
                        <Button variant="light" color="orange" leftSection={<IconEdit size={16} />} onClick={() => setChangeMode(true)}>
                          Demander une modification
                        </Button>
                      </>
                    )}
                    {c.generations >= maxGen && (
                      <Text size="xs" c="orange.8">
                        Limite de {maxGen} générations atteinte : une nouvelle demande dépassera le budget prévu (simulation).
                      </Text>
                    )}
                  </>
                )}
                {c.status === 'scheduled' && (
                  <>
                    <Alert color="blue" variant="light" icon={<IconCalendarCheck size={18} />}>
                      {dayjs(c.scheduledAt).isSame(dayjs().add(1, 'day'), 'day') ? 'Programmé pour demain' : 'Programmé'} à {dayjs(c.scheduledAt).format('HH:mm')}.
                    </Alert>
                    <Button variant="subtle" color="red" size="xs" loading={busy === 'simulate_error'} onClick={() => act('simulate_error', ['Erreur simulée', 'La publication a échoué.'], notifyError)}>
                      Simuler une erreur de publication
                    </Button>
                  </>
                )}
                {c.status === 'error' && (
                  <>
                    <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />} title="Échec de publication">
                      {c.errorMessage}
                    </Alert>
                    <Button color="red" leftSection={<IconRefresh size={16} />} loading={busy === 'retry'} onClick={() => act('retry', ['Nouvelle tentative lancée', 'Résultat dans quelques secondes (simulation).'], notifyInfo)}>
                      Nouvelle tentative
                    </Button>
                  </>
                )}
                {c.status === 'published' && (
                  <Alert color="sage" variant="light" icon={<IconCircleCheck size={18} />}>
                    Publié (simulation). Aucune publication réelle n’a été effectuée.
                  </Alert>
                )}
              </Stack>
            </Card>

            <SectionCard title="Détails">
              <Stack gap={8}>
                <Row label="Format">{formatLabel[c.format]}</Row>
                <Row label="Date souhaitée">{fmtDateTime(c.scheduledAt)}</Row>
                <Row label="Agent">
                  <AgentChip agentId={c.agentId} size="xs" />
                </Row>
                <Row label="Générations">
                  {c.generations} / {maxGen}
                </Row>
                <Row label="Réseaux">{imageNetworks.length ? `${imageNetworks.length} image` : ''}{imageNetworks.length && c.networks.includes('tiktok') ? ' + ' : ''}{c.networks.includes('tiktok') ? 'TikTok vidéo' : ''}</Row>
              </Stack>
            </SectionCard>

            <SectionCard title="Historique">
              <Timeline bulletSize={12} lineWidth={2}>
                {[...c.history].reverse().map((h, i) => (
                  <Timeline.Item key={i}>
                    <Text size="sm">{h.text}</Text>
                    <Text size="xs" c="dimmed">
                      {fmtDateTime(h.date)}
                    </Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            </SectionCard>
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" component="div" ta="right">
        {children}
      </Text>
    </Group>
  );
}

function MockVisual({ palette, title, aspect, big }: { palette: string[]; title: string; aspect: string; big?: boolean }) {
  const [a, b = '#f2ede4', c2 = a] = palette;
  return (
    <Box
      style={{
        aspectRatio: aspect,
        borderRadius: 10,
        background: `linear-gradient(135deg, ${a} 0%, ${a} 45%, ${c2} 100%)`,
        border: '1px solid var(--app-border)',
        display: 'flex',
        alignItems: 'flex-end',
        padding: big ? 16 : 6,
        overflow: 'hidden',
      }}
    >
      <Text c={b} fw={700} size={big ? 'lg' : '8px'} lh={1.15} lineClamp={big ? 3 : 2} style={{ fontFamily: 'Georgia, serif' }}>
        {title}
      </Text>
    </Box>
  );
}
