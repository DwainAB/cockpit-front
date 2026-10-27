import { Alert, Anchor, Badge, Box, Button, Card, Checkbox, Grid, Group, Image, Loader, Modal, SimpleGrid, Stack, Stepper, Tabs, Text, Textarea, TextInput, Timeline } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import {
  IconAlertTriangle,
  IconArrowsShuffle,
  IconBulb,
  IconCalendarCheck,
  IconCheck,
  IconCircleCheck,
  IconDownload,
  IconEdit,
  IconExternalLink,
  IconPencil,
  IconTrash,
  IconPhoto,
  IconPlayerPlay,
  IconRefresh,
  IconSend,
  IconUsersGroup,
  IconVideo,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/api';
import { assetUrl } from '@/api/http';
import { AgentChip, NetworkIcon, PageHeader, PageSkeleton, SectionCard, StatusBadge } from '@/components/ui';
import { type Content, type ContentAction, contentStatus, type ContentStatus, dayjs, fmtDateTime, formatLabel, type Network, networkLabel, originLabel, paths, POST_NETWORKS } from '@/core';
import { notifyError, notifyInfo, notifySuccess } from '@/lib/notify';
import { useProject } from '@/hooks/useProject';
import { useSimulatedLoading } from '@/lib/useSimulatedLoading';
import { useStore } from '@/store';
import NotFoundPage from './NotFoundPage';

const stepIndex: Record<ContentStatus, number> = {
  idea: 0,
  topic_review: 0,
  preparing: 1,
  visual_review: 2,
  approved: 3,
  scheduled: 3,
  publishing: 3,
  error: 3,
  published: 5,
};

/** Statuts où les textes et la date se retouchent encore. */
const editable: ContentStatus[] = ['idea', 'visual_review', 'scheduled', 'error'];

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

  const agentName = useStore.getState().agents.find((a) => a.id === c.agentId)?.name ?? 'L’agent';

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
        description={`Publication ${c.status === 'published' ? 'effectuée' : 'prévue'} le ${fmtDateTime(c.scheduledAt)}`}
        actions={<PostActions c={c} />}
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

            {c.image && (
              <SectionCard title="Image du post" subtitle="Créée par l’agent, utilisée sur chaque réseau" icon={<IconPhoto size={18} />}>
                <Group align="flex-start" gap="lg" wrap="wrap">
                  <Image src={assetUrl(c.image.url)} alt={c.imageAlt ?? c.title} w={280} radius="md" style={{ aspectRatio: '4 / 5', objectFit: 'cover' }} />
                  <Stack gap={6} style={{ flex: 1, minWidth: 200 }}>
                    {c.imageAlt && (
                      <Text size="sm" c="dimmed">
                        {c.imageAlt}
                      </Text>
                    )}
                    <Text size="xs" c="dimmed">
                      Format portrait 4:5, accepté par Instagram, Facebook, LinkedIn et TikTok.
                    </Text>
                    <Button component="a" href={assetUrl(c.image.url)} download size="xs" variant="default" leftSection={<IconDownload size={14} />} w="fit-content">
                      Télécharger l’image
                    </Button>
                  </Stack>
                </Group>
              </SectionCard>
            )}

            {!c.image && c.masterVisual && (
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

            {!c.image && !c.masterVisual && !c.video && (
              <Card>
                <Text size="sm" c="dimmed">
                  Aucune image pour l’instant : l’agent la créera avec les textes du post.
                </Text>
              </Card>
            )}

            <CaptionsCard c={c} />
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Stack gap="md">
            <Card>
              <Text fw={650} mb="md">
                Validation
              </Text>
              <Stepper active={stepIndex[c.status]} orientation="vertical" size="sm" color={c.status === 'error' ? 'red' : 'sage'}>
                <Stepper.Step label="Idée" description={c.status === 'idea' ? 'À confier à l’agent' : 'Transmise'} />
                <Stepper.Step label="Création" description={c.status === 'preparing' ? `${agentName} crée le post…` : stepIndex[c.status] > 1 ? 'Textes et image prêts' : 'À venir'} />
                <Stepper.Step label="Validation" description={c.status === 'visual_review' ? 'En attente de votre validation' : stepIndex[c.status] > 2 ? 'Validé' : 'À venir'} />
                <Stepper.Step
                  label="Programmation"
                  description={c.status === 'scheduled' ? `Le ${fmtDateTime(c.scheduledAt)}` : c.status === 'publishing' ? 'Publication en cours…' : c.status === 'error' ? 'Échec de publication' : 'À venir'}
                />
                <Stepper.Step label="Publication" description={c.status === 'published' ? 'Publié' : 'À venir'} />
              </Stepper>

              <Stack gap="sm" mt="lg">
                {c.generationError && (
                  <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />} title="Création du post échouée">
                    {c.generationError}
                  </Alert>
                )}
                {editable.includes(c.status) && c.status !== 'error' && <ScheduleField c={c} />}
                {c.status === 'idea' && (
                  <Button leftSection={<IconSend size={16} />} loading={busy === 'submit_topic'} onClick={() => act('submit_topic', ['Demande envoyée', `${agentName} crée les textes et l’image.`])}>
                    {c.generationError ? 'Relancer la création' : `Demander à ${agentName} de créer le post`}
                  </Button>
                )}
                {c.status === 'topic_review' && (
                  <>
                    <Button color="sage" leftSection={<IconCheck size={16} />} loading={busy === 'validate_topic'} onClick={() => act('validate_topic', ['Sujet validé', `${agentName} crée le post.`])}>
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
                    <Text size="sm">{agentName} crée les textes et l’image… (environ une minute)</Text>
                  </Group>
                )}
                {c.status === 'visual_review' && (
                  <>
                    {changeMode && (
                      <Textarea
                        autosize
                        minRows={2}
                        label="Modification attendue"
                        description="L’agent corrige le post et retient votre remarque pour les suivants."
                        placeholder="Ex. : image plus lumineuse, texte plus court, moins d’emojis"
                        value={comment}
                        onChange={(e) => setComment(e.currentTarget.value)}
                      />
                    )}
                    {changeMode ? (
                      <Group grow>
                        <Button color="orange" loading={busy === 'request_changes'} onClick={() => act('request_changes', ['Modification demandée', `${agentName} corrige le post.`])}>
                          Envoyer
                        </Button>
                        <Button variant="default" onClick={() => setChangeMode(false)}>
                          Annuler
                        </Button>
                      </Group>
                    ) : (
                      <>
                        <Button color="sage" leftSection={<IconCheck size={16} />} loading={busy === 'validate_visual'} onClick={() => act('validate_visual', ['Post validé', `Publication prévue le ${fmtDateTime(c.scheduledAt)}.`])}>
                          Valider et programmer
                        </Button>
                        <Button variant="light" color="orange" leftSection={<IconEdit size={16} />} onClick={() => setChangeMode(true)}>
                          Demander une modification
                        </Button>
                      </>
                    )}
                    {c.generations >= maxGen && (
                      <Text size="xs" c="orange.8">
                        {c.generations} créations pour ce post : au-delà de {maxGen}, chaque nouvelle image reste facturée.
                      </Text>
                    )}
                  </>
                )}
                {c.status === 'scheduled' && (
                  <>
                    <Alert color="blue" variant="light" icon={<IconCalendarCheck size={18} />}>
                      Publication automatique le {dayjs(c.scheduledAt).format('dddd D MMMM à HH:mm')}.
                    </Alert>
                    <Button variant="light" leftSection={<IconSend size={16} />} loading={busy === 'publish_now'} onClick={() => act('publish_now', ['Publication lancée'], notifyInfo)}>
                      Publier maintenant
                    </Button>
                  </>
                )}
                {c.status === 'publishing' && (
                  <Group gap="sm" p="sm" style={{ background: 'var(--app-surface-2)', borderRadius: 8 }}>
                    <Loader size="xs" />
                    <Text size="sm">Publication en cours…</Text>
                  </Group>
                )}
                {c.status === 'error' && (
                  <>
                    <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />} title="Échec de publication">
                      {c.errorMessage}
                    </Alert>
                    <Button color="red" leftSection={<IconRefresh size={16} />} loading={busy === 'retry'} onClick={() => act('retry', ['Nouvelle tentative lancée'], notifyInfo)}>
                      Réessayer (réseaux en échec seulement)
                    </Button>
                  </>
                )}
                {c.status === 'published' && (
                  <Alert color="sage" variant="light" icon={<IconCircleCheck size={18} />}>
                    Publié sur {c.networks.map((n) => networkLabel[n]).join(', ')}.
                  </Alert>
                )}
                {c.publications && <PublicationList c={c} />}
              </Stack>
            </Card>

            <SectionCard title="Détails">
              <Stack gap={8}>
                <Row label="Format">{formatLabel[c.format]}</Row>
                <Row label="Date souhaitée">{fmtDateTime(c.scheduledAt)}</Row>
                <Row label="Agent">
                  <AgentChip agentId={c.agentId} size="xs" />
                </Row>
                <Row label="Créations">
                  {c.generations} / {maxGen}
                </Row>
                <Row label="Réseaux">{c.networks.map((n) => networkLabel[n]).join(', ')}</Row>
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

/** Textes par réseau, modifiables tant que le post n'est pas publié. */
function CaptionsCard({ c }: { c: Content }) {
  const [drafts, setDrafts] = useState<Partial<Record<Network, string>>>({});
  const [saving, setSaving] = useState(false);
  const canEdit = editable.includes(c.status);
  const dirty = c.networks.some((n) => drafts[n] !== undefined && drafts[n] !== (c.captions[n] ?? ''));
  const first = c.networks[0];
  if (!first) return null;

  const save = async () => {
    setSaving(true);
    try {
      await api.contents.update(c.id, { captions: drafts });
      setDrafts({});
      notifySuccess('Textes enregistrés');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Textes par réseau"
      subtitle={canEdit ? 'Vous pouvez les retoucher avant publication.' : undefined}
      icon={<IconEdit size={18} />}
      action={
        dirty ? (
          <Button size="xs" loading={saving} onClick={() => void save()}>
            Enregistrer les textes
          </Button>
        ) : undefined
      }
    >
      <Tabs defaultValue={first} variant="pills">
        <Tabs.List mb="md">
          {c.networks.map((n) => (
            <Tabs.Tab key={n} value={n} leftSection={<NetworkIcon network={n} size={18} />}>
              {networkLabel[n]}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {c.networks.map((n) => (
          <Tabs.Panel key={n} value={n}>
            {canEdit && c.captions[n] !== undefined ? (
              <Textarea autosize minRows={6} value={drafts[n] ?? c.captions[n] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [n]: e.currentTarget.value }))} />
            ) : (
              <Box p="md" style={{ background: 'var(--app-surface-2)', borderRadius: 10, whiteSpace: 'pre-line' }}>
                <Text size="sm">{c.captions[n] ?? 'Texte en attente : l’agent l’écrira en créant le post.'}</Text>
              </Box>
            )}
            <Text size="xs" c="dimmed" mt={6}>
              {(drafts[n] ?? c.captions[n] ?? '').length} caractères
            </Text>
          </Tabs.Panel>
        ))}
      </Tabs>
    </SectionCard>
  );
}

/** Date et heure de publication, modifiables jusqu'à la publication. */
function ScheduleField({ c }: { c: Content }) {
  const change = async (value: Date | null) => {
    if (!value) return;
    await api.contents.update(c.id, { scheduledAt: value.toISOString() });
    notifySuccess('Date de publication modifiée', dayjs(value).format('dddd D MMMM à HH:mm'));
  };
  return (
    <DateTimePicker
      label="Date de publication"
      valueFormat="dddd D MMMM YYYY · HH:mm"
      value={new Date(c.scheduledAt)}
      minDate={new Date()}
      onChange={(v) => void change(v)}
    />
  );
}

/** Résultat de la publication, réseau par réseau. */
function PublicationList({ c }: { c: Content }) {
  return (
    <Stack gap={6}>
      {c.networks.map((n) => {
        const r = c.publications?.[n];
        if (!r) return null;
        return (
          <Group key={n} gap="xs" wrap="nowrap" align="flex-start">
            <NetworkIcon network={n} size={18} />
            <Text size="xs" c={r.status === 'published' ? 'sage.8' : 'red.7'} style={{ flex: 1 }}>
              {r.status === 'published' ? `Publié le ${fmtDateTime(r.at)}` : r.error}
            </Text>
            {r.url && (
              <Anchor href={r.url} target="_blank" rel="noreferrer" size="xs">
                <IconExternalLink size={14} />
              </Anchor>
            )}
          </Group>
        );
      })}
    </Stack>
  );
}

/** Modifier le sujet, les réseaux et la date, ou supprimer le post. */
function PostActions({ c }: { c: Content }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(c.title);
  const [objective, setObjective] = useState(c.objective);
  const [networks, setNetworks] = useState<string[]>(c.networks);
  const [date, setDate] = useState<Date | null>(new Date(c.scheduledAt));
  const canEdit = editable.includes(c.status);
  const canDelete = c.status !== 'publishing' && c.status !== 'preparing';

  const openEdit = () => {
    setTitle(c.title);
    setObjective(c.objective);
    setNetworks(c.networks);
    setDate(new Date(c.scheduledAt));
    setEditing(true);
  };
  const save = async () => {
    setBusy(true);
    try {
      await api.contents.update(c.id, { title, objective, networks: networks as Network[], scheduledAt: date?.toISOString() });
      notifySuccess('Post modifié');
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await api.contents.remove(c.id);
      notifySuccess('Post supprimé', c.title);
      navigate(paths.communication(c.projectId));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Group gap="xs">
        {canEdit && (
          <Button variant="default" leftSection={<IconPencil size={16} />} onClick={openEdit}>
            Modifier
          </Button>
        )}
        {canDelete && (
          <Button variant="light" color="red" leftSection={<IconTrash size={16} />} onClick={() => setDeleting(true)}>
            Supprimer
          </Button>
        )}
      </Group>

      <Modal opened={editing} onClose={() => setEditing(false)} title={<Text fw={650}>Modifier le post</Text>}>
        <Stack>
          <TextInput label="Sujet" value={title} onChange={(e) => setTitle(e.currentTarget.value)} withAsterisk />
          <Textarea label="Objectif" autosize minRows={2} value={objective} onChange={(e) => setObjective(e.currentTarget.value)} />
          <Checkbox.Group label="Réseaux" value={networks} onChange={setNetworks}>
            <Group mt={6}>
              {POST_NETWORKS.map((n) => (
                <Checkbox key={n} value={n} label={networkLabel[n]} />
              ))}
            </Group>
          </Checkbox.Group>
          <DateTimePicker label="Date de publication" valueFormat="dddd D MMMM YYYY · HH:mm" value={date} onChange={setDate} />
          {c.status !== 'idea' && (
            <Text size="xs" c="dimmed">
              Les textes déjà écrits ne changent pas. Pour les refaire après un changement de sujet, utilisez « Demander une modification ».
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditing(false)}>
              Annuler
            </Button>
            <Button loading={busy} disabled={!title.trim() || !networks.length || !date} onClick={() => void save()}>
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={deleting} onClose={() => setDeleting(false)} title={<Text fw={650}>Supprimer ce post ?</Text>}>
        <Stack>
          <Text size="sm">
            « {c.title} » sera retiré du calendrier{c.status === 'scheduled' ? ' et ne sera pas publié' : ''}.
            {c.status === 'published' ? ' Il reste en ligne sur les réseaux : seule sa trace dans le cockpit est supprimée.' : ''}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleting(false)}>
              Annuler
            </Button>
            <Button color="red" loading={busy} onClick={() => void remove()}>
              Supprimer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
