import { Alert, Anchor, Badge, Button, Card, Grid, Group, Progress, Stack, Stepper, Tabs, Text, Textarea, Timeline } from '@mantine/core';
import { IconAlertTriangle, IconBrain, IconBrandFacebook, IconBrandGithub, IconBrandInstagram, IconBrandLinkedin, IconBrandTiktok, IconCreditCard, IconHistory, IconLayoutDashboard, IconMail, IconMapPin, IconMessageCircle, IconPhone, IconReceipt, IconStack2, IconToolsKitchen2, IconUser, IconUsers, IconWorld } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/api';
import { MemoryList } from '@/components/domain/MemoryList';
import { StepBullet } from '@/components/domain/StepBullet';
import { ActivityFeed, AgentChip, EmptyState, PageHeader, PageSkeleton, SectionCard, StatusBadge } from '@/components/ui';
import { YumcoSection } from '@/components/restaurant/YumcoSection';
import { currentStep, currentStepLabel, fmtDate, paths, RESTAURANT_PROJECT, restaurantStatus, siteStatus, stepStatus, stripeStatus, type StripeStatus, workflowProgress, workflowSteps } from '@/core';
import { notifySuccess } from '@/lib/notify';
import { useSimulatedLoading } from '@/lib/useSimulatedLoading';
import { useStore } from '@/store';
import NotFoundPage from './NotFoundPage';
import { useOpenConversation } from '@/hooks/useOpenConversation';

const stripeOrder: StripeStatus[] = ['not_started', 'invite_to_send', 'info_pending', 'configured'];
const stripeNext: Partial<Record<StripeStatus, { label: string; to: StripeStatus }>> = {
  not_started: { label: 'Préparer l’invitation', to: 'invite_to_send' },
  invite_to_send: { label: 'Envoyer l’invitation (simulé)', to: 'info_pending' },
  info_pending: { label: 'Marquer comme configuré (simulé)', to: 'configured' },
};

export default function RestaurantDetailPage() {
  const { restaurantId } = useParams();
  const loading = useSimulatedLoading(350);
  const r = useStore((s) => s.restaurants.find((x) => x.id === restaurantId));
  const activities = useStore((s) => s.activities).filter((a) => a.link?.includes(restaurantId ?? '__'));
  const [params, setParams] = useSearchParams();
  const tab = params.get('onglet') ?? 'apercu';
  const openConversation = useOpenConversation();
  const [note, setNote] = useState('');
  const [stripeBusy, setStripeBusy] = useState(false);

  if (loading) return <PageSkeleton cards={3} />;
  if (!r) return <NotFoundPage what="Ce restaurant" />;

  const step = currentStep(r);
  const progress = workflowProgress(r);
  const socials = [
    { icon: IconBrandInstagram, v: r.socials.instagram },
    { icon: IconBrandFacebook, v: r.socials.facebook },
    { icon: IconBrandTiktok, v: r.socials.tiktok },
    { icon: IconBrandLinkedin, v: r.socials.linkedin },
  ].filter((s) => s.v);
  const next = stripeNext[r.stripeStatus];

  return (
    <>
      <PageHeader
        eyebrow={
          <Group gap="xs">
            <Text size="xs" c="dimmed" fw={600} tt="uppercase">
              {[r.cuisine, r.city].filter(Boolean).join(' · ')}
            </Text>
            <StatusBadge meta={restaurantStatus[r.status]} />
          </Group>
        }
        title={r.name}
        description={r.description}
        actions={
          <>
            {r.repoUrl && (
              <Button variant="default" leftSection={<IconBrandGithub size={16} />} component="a" href={r.repoUrl} target="_blank" rel="noopener">
                Code
              </Button>
            )}
            {r.siteUrl && (
              <Button variant="default" leftSection={<IconWorld size={16} />} component="a" href={r.siteUrl} target="_blank" rel="noopener">
                {r.siteUrl.replace(/^https:\/\//, '')}
              </Button>
            )}
            <Button leftSection={<IconMessageCircle size={16} />} onClick={() => openConversation(step?.agentId ?? r.agentId, RESTAURANT_PROJECT)}>
              Ouvrir la conversation
            </Button>
          </>
        }
      />

      <Tabs value={tab} onChange={(v) => setParams(v && v !== 'apercu' ? { onglet: v } : {}, { replace: true })} keepMounted={false} mb="md">
        <Tabs.List>
          <Tabs.Tab value="apercu" leftSection={<IconLayoutDashboard size={16} />}>
            Vue d’ensemble
          </Tabs.Tab>
          <Tabs.Tab value="carte" leftSection={<IconToolsKitchen2 size={16} />}>
            Carte
          </Tabs.Tab>
          <Tabs.Tab value="utilisateurs" leftSection={<IconUsers size={16} />}>
            Utilisateurs
          </Tabs.Tab>
          <Tabs.Tab value="commandes" leftSection={<IconReceipt size={16} />}>
            Commandes
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {tab !== 'apercu' ? (
        <YumcoSection restaurantId={r.id} section={tab} />
      ) : (
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Stack gap="md">
              <Card>
                <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
                  <div>
                    <Text size="xs" c="dimmed">
                      Étape actuelle
                    </Text>
                    <Text fw={650} size="lg">
                      {currentStepLabel(r)}
                    </Text>
                    <Group gap="xs" mt={4}>
                      {step && <StatusBadge meta={stepStatus[step.status]} />}
                      {step && <AgentChip agentId={step.agentId} size="xs" />}
                    </Group>
                  </div>
                  <div style={{ minWidth: 220, flex: '0 1 300px' }}>
                    <Group justify="space-between" mb={4}>
                      <Text size="xs" c="dimmed">
                        Progression du site
                      </Text>
                      <Text size="xs" fw={600}>
                        {progress} %
                      </Text>
                    </Group>
                    <Progress value={progress} color={r.blocker ? 'red' : 'sage'} />
                    <Text size="xs" c="dimmed" mt={6}>
                      Prochaine action : <b>{r.nextAction}</b>
                    </Text>
                  </div>
                </Group>
                {r.blocker && (
                  <Alert mt="md" color="red" variant="light" icon={<IconAlertTriangle size={18} />} title="Blocage en cours">
                    {r.blocker}.{' '}
                    <Anchor component={Link} to={paths.workflow(r.id)} size="sm">
                      Ouvrir le workflow
                    </Anchor>
                  </Alert>
                )}
              </Card>

              <SectionCard title="Étapes du site" icon={<IconStack2 size={18} />} action={<Button size="compact-sm" variant="subtle" component={Link} to={paths.workflow(r.id)}>Détail</Button>}>
                <Timeline bulletSize={24} lineWidth={2} active={-1}>
                  {r.workflow.map((s) => {
                    const meta = workflowSteps.find((w) => w.key === s.key)!;
                    return (
                      <Timeline.Item key={s.key} bullet={<StepBullet status={s.status} />} lineVariant={s.status === 'done' ? 'solid' : 'dashed'}>
                        <Group justify="space-between" wrap="nowrap" gap="sm">
                          <Text size="sm" fw={s === step ? 650 : 500} c={s.status === 'todo' || s.status === 'skipped' ? 'dimmed' : undefined}>
                            {meta.label}
                          </Text>
                          <Group gap="xs" wrap="nowrap">
                            {s.date && s.status !== 'todo' && (
                              <Text size="xs" c="dimmed" visibleFrom="xs">
                                {fmtDate(s.date)}
                              </Text>
                            )}
                            <StatusBadge meta={stepStatus[s.status]} size="xs" />
                          </Group>
                        </Group>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              </SectionCard>


              <SectionCard title="Historique d’activité" icon={<IconHistory size={18} />}>
                <ActivityFeed items={activities} limit={10} />
              </SectionCard>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Stack gap="md">
              <SectionCard title="Site" icon={<IconWorld size={18} />} action={<StatusBadge meta={siteStatus[r.siteStatus ?? 'delivered']} />}>
                <Stack gap={6}>
                  {r.siteUrl ? (
                    <Anchor href={r.siteUrl} target="_blank" rel="noopener" size="sm">
                      {r.siteUrl.replace(/^https?:\/\//, '')}
                    </Anchor>
                  ) : (
                    <Text size="sm" c="dimmed">
                      Adresse du site non renseignée
                    </Text>
                  )}
                  {r.repoUrl && (
                    <Anchor href={r.repoUrl} target="_blank" rel="noopener" size="xs" c="dimmed">
                      Code source : {r.repoUrl.replace(/^https:\/\/github\.com\//, '')}
                    </Anchor>
                  )}
                  {(r.siteStatus ?? 'delivered') === 'delivered' && (
                    <Text size="xs" c="dimmed">
                      Site livré avant le suivi des statuts dans Yumco.
                    </Text>
                  )}
                </Stack>
              </SectionCard>

              <SectionCard title="Fiche restaurant">
                <Stack gap={8}>
                  <Group gap={8} wrap="nowrap">
                    <IconMapPin size={16} color="#8a8999" />
                    <Text size="sm">
                      {r.address || '—'}, {r.city}
                    </Text>
                  </Group>
                  <Group gap={8} wrap="nowrap">
                    <IconPhone size={16} color="#8a8999" />
                    <Text size="sm">{r.phone || '—'}</Text>
                  </Group>
                  <Group gap={8} wrap="nowrap">
                    <IconMail size={16} color="#8a8999" />
                    <Text size="sm">{r.email || '—'}</Text>
                  </Group>
                  <Group gap={6} mt={4}>
                    {socials.length ? (
                      socials.map(({ icon: Icon, v }) => (
                        <Badge key={v} variant="light" color="gray" tt="none" leftSection={<Icon size={12} />}>
                          {v}
                        </Badge>
                      ))
                    ) : (
                      <Text size="xs" c="dimmed">
                        Aucun réseau social renseigné
                      </Text>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed" mt={4}>
                    Client depuis le {fmtDate(r.createdAt)}
                  </Text>
                </Stack>
                <Card withBorder={false} shadow="none" mt="md" padding="sm" bg="var(--app-surface-2)">
                  <Group gap={8} mb={4}>
                    <IconUser size={16} />
                    <Text size="sm" fw={600}>
                      {r.contact.name}
                    </Text>
                    {r.contact.role && (
                      <Text size="xs" c="dimmed">
                        {r.contact.role}
                      </Text>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    {r.contact.email} · {r.contact.phone}
                  </Text>
                </Card>
              </SectionCard>

              <SectionCard title="Paiement en ligne" subtitle="État Stripe mocké — aucune donnée bancaire" icon={<IconCreditCard size={18} />}>
                {r.wantsOnlinePayment ? (
                  <>
                    <Group justify="space-between" mb="md">
                      <Text size="sm">État</Text>
                      <StatusBadge meta={stripeStatus[r.stripeStatus]} />
                    </Group>
                    <Stepper active={stripeOrder.indexOf(r.stripeStatus)} orientation="vertical" size="xs" color="sage">
                      {stripeOrder.map((s) => (
                        <Stepper.Step key={s} label={stripeStatus[s].label} />
                      ))}
                    </Stepper>
                    {next && (
                      <Button
                        mt="md"
                        fullWidth
                        variant="light"
                        loading={stripeBusy}
                        onClick={async () => {
                          setStripeBusy(true);
                          await api.restaurants.setStripeStatus(r.id, next.to).finally(() => setStripeBusy(false));
                          notifySuccess('État du paiement mis à jour', `${stripeStatus[next.to].label} (simulation).`);
                        }}
                      >
                        {next.label}
                      </Button>
                    )}
                    <Text size="xs" c="dimmed" mt="sm">
                      Aucune connexion à Stripe. Les coordonnées bancaires ne sont jamais affichées dans le cockpit.
                    </Text>
                  </>
                ) : (
                  <EmptyState compact title="Paiement en ligne non souhaité" description="L’étape d’intégration du paiement est ignorée dans le workflow." icon={<IconCreditCard size={18} />} />
                )}
              </SectionCard>

              <SectionCard title="Notes et mémoire" icon={<IconBrain size={18} />}>
                {r.internalNotes && (
                  <Text size="sm" p="sm" mb="md" style={{ background: 'var(--mantine-color-yellow-0)', borderRadius: 8 }}>
                    <b>Note interne :</b> {r.internalNotes}
                  </Text>
                )}
                <MemoryList notes={r.memory} />
                <Textarea mt="md" placeholder="Ajouter une information à retenir…" autosize minRows={2} value={note} onChange={(e) => setNote(e.currentTarget.value)} />
                <Button
                  mt="xs"
                  size="xs"
                  variant="light"
                  disabled={!note.trim()}
                  onClick={async () => {
                    await api.restaurants.addNote(r.id, note.trim());
                    setNote('');
                    notifySuccess('Ajouté à la mémoire du restaurant');
                  }}
                >
                  Ajouter à la mémoire
                </Button>
              </SectionCard>
            </Stack>
          </Grid.Col>
        </Grid>
      )}
    </>
  );
}
