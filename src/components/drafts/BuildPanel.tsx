import {
  Anchor,
  TextInput,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  List,
  Loader,
  SegmentedControl,
  Stack,
  Stepper,
  Text,
  Textarea,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { IconAlertTriangle, IconBrandGithub, IconCheck, IconWorld, IconCircleX, IconDeviceDesktop, IconDeviceMobile, IconExternalLink, IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildStatus, currentBuild, fromNow, paths, REPO_NAME_RE, repoNameOf, fmtDateTime, usd, type SiteBuild, type SiteDraft } from '@/core';
import { api } from '@/api';
import { AgentAvatar, SectionCard, StatusBadge } from '@/components/ui';
import { useStore } from '@/store';
import { useAgent } from '@/store/selectors';
import { notifySuccess } from '@/lib/notify';

const stepOf: Record<SiteBuild['status'], number> = { queued: 0, building: 0, testing: 1, ready: 2, failed: 1, validated: 3 };

/** Site développé par l'agent chargé du développement (Paramètres → Agents IA) : aperçu, tests, validation ou modification. */
export function BuildPanel({ draft }: { draft: SiteDraft }) {
  const developer = useAgent(useStore((s) => s.settings.siteAgents?.development));
  const devName = developer?.name ?? 'L’agent développeur';
  const latest = currentBuild(draft)!;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const builds = draft.builds.filter((b) => b.designVersionId === latest.designVersionId);
  const selected = builds.find((b) => b.id === selectedId) ?? latest;
  // Mode démo : pas de site compilé, l'aperçu reprend la maquette validée.
  const mockupHtml = draft.versions.find((v) => v.id === selected.designVersionId)?.html;
  const running = latest.status === 'queued' || latest.status === 'building' || latest.status === 'testing';

  return (
    <Grid gutter="md">
      <Grid.Col span={{ base: 12, lg: 8 }}>
        <Card padding={0}>
          <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid var(--app-border)' }} wrap="wrap" gap="xs">
            <Group gap="xs">
              <Text size="sm" fw={600}>
                Développement n° {selected.number}
              </Text>
              {selected.simulated && (
                <Badge variant="light" color="orange" tt="none">
                  Simulé
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
                <Tooltip label="Ouvrir le site dans un nouvel onglet">
                  <Button size="xs" variant="subtle" component="a" href={selected.previewUrl} target="_blank" rel="noopener" px={8}>
                    <IconExternalLink size={16} />
                  </Button>
                </Tooltip>
              )}
            </Group>
          </Group>
          {selected.status === 'ready' || selected.status === 'validated' ? (
            <Box bg="var(--app-surface-2)" p={device === 'mobile' ? 'md' : 0} style={{ display: 'flex', justifyContent: 'center' }}>
              {/* Le site est servi par une origine distincte du cockpit : ses scripts ne peuvent pas y accéder. */}
              <iframe
                key={selected.id}
                title={`Site développé n° ${selected.number}`}
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                src={selected.previewUrl ?? undefined}
                srcDoc={selected.previewUrl ? undefined : mockupHtml}
                style={{
                  width: device === 'mobile' ? 390 : '100%',
                  height: 'calc(100dvh - 280px)',
                  minHeight: 560,
                  border: device === 'mobile' ? '1px solid var(--app-border)' : 0,
                  borderRadius: device === 'mobile' ? 24 : 0,
                  background: '#fff',
                  display: 'block',
                }}
              />
            </Box>
          ) : selected.status === 'failed' ? (
            <Box p="xl" mih={420}>
              <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />} title="Le développement a échoué">
                {selected.error}
              </Alert>
            </Box>
          ) : (
            <Stack align="center" justify="center" mih={520} gap="sm" p="xl" ta="center">
              {developer && <AgentAvatar agent={developer} size={40} />}
              <Loader />
              <Text fw={600}>
                {selected.status === 'queued'
                  ? `En attente de ${devName}…`
                  : selected.status === 'building'
                    ? `${devName} code le site en Next.js…`
                    : 'Compilation et tests automatiques…'}
              </Text>
              <Text size="sm" c="dimmed">
                {selected.attempts > 1 ? `Correction automatique en cours (tentative ${selected.attempts}). ` : ''}
                Cela prend généralement 3 à 6 minutes. La fiche passera dans « Site à valider » automatiquement.
              </Text>
            </Stack>
          )}
        </Card>
      </Grid.Col>

      <Grid.Col span={{ base: 12, lg: 4 }}>
        <Stack gap="md">
          <Card>
            <Stepper active={stepOf[latest.status]} orientation="vertical" size="sm" color={latest.status === 'failed' ? 'red' : 'sage'}>
              <Stepper.Step
                label="Développement"
                description="Next.js, à partir de la maquette validée"
                loading={latest.status === 'building' || latest.status === 'queued'}
              />
              <Stepper.Step label="Tests automatiques" description="Liens, horaires, coordonnées, référencement" loading={latest.status === 'testing'} />
              <Stepper.Step label="Site à valider" description="Votre validation" />
            </Stepper>
            <Box mt="md">
              <BuildActions draft={draft} build={latest} running={running} />
            </Box>
          </Card>

          <RepoNameCard draft={draft} />

          {selected.checks.length > 0 && (
            <SectionCard
              title="Tests automatiques"
              subtitle={`${selected.checks.filter((c) => c.passed).length}/${selected.checks.length} réussis${selected.attempts > 1 ? ` · ${selected.attempts} tentatives` : ''}`}
            >
              <List spacing={6} size="sm" center>
                {selected.checks.map((c) => (
                  <List.Item
                    key={c.name}
                    icon={
                      <ThemeIcon size={18} radius="xl" color={c.passed ? 'sage' : 'red'} variant="light">
                        {c.passed ? <IconCheck size={12} /> : <IconCircleX size={12} />}
                      </ThemeIcon>
                    }
                  >
                    <Text size="sm">{c.name}</Text>
                    {c.detail && (
                      <Text size="xs" c={c.passed ? 'dimmed' : 'red.7'} lineClamp={4}>
                        {c.detail}
                      </Text>
                    )}
                  </List.Item>
                ))}
              </List>
            </SectionCard>
          )}

          {selected.notes.length > 0 && (
            <Alert variant="light" color="yellow" icon={<IconAlertTriangle size={18} />} title={`Remarques de ${devName}`}>
              <Stack gap={4}>
                {selected.notes.map((n) => (
                  <Text key={n} size="sm">
                    • {n}
                  </Text>
                ))}
              </Stack>
            </Alert>
          )}

          <SectionCard title="Développements">
            <Stack gap={4}>
              {[...builds].reverse().map((b) => (
                <UnstyledButton
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  p="xs"
                  style={{ borderRadius: 8, background: b.id === selected.id ? 'var(--mantine-color-night-0)' : undefined }}
                >
                  <Group justify="space-between" wrap="nowrap" gap="xs">
                    <Text size="sm" fw={600}>
                      n° {b.number}
                    </Text>
                    <StatusBadge meta={buildStatus[b.status]} size="xs" />
                  </Group>
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {b.feedback ? `Modification : « ${b.feedback} »` : 'Développement initial'}
                  </Text>
                  <Text size="10px" c="dimmed">
                    {fmtDateTime(b.createdAt)}
                    {b.usage && ` · ${usd(b.usage.costUsd)}`}
                  </Text>
                </UnstyledButton>
              ))}
            </Stack>
          </SectionCard>
        </Stack>
      </Grid.Col>
    </Grid>
  );
}

function BuildActions({ draft, build, running }: { draft: SiteDraft; build: SiteBuild; running: boolean }) {
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState<null | 'validate' | 'changes'>(null);

  if (running)
    return (
      <Text size="sm" c="dimmed">
        Le site sera à valider une fois les tests réussis.
      </Text>
    );
  if (build.status === 'validated') return <DeliveryStatus draft={draft} />;

  const requestChanges = async () => {
    setBusy('changes');
    try {
      await api.drafts.requestBuildChanges(draft.id, feedback.trim() || undefined);
      setFeedback('');
      notifySuccess(build.status === 'failed' ? 'Développement relancé' : 'Modification demandée', 'Le site repasse en développement.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Stack gap="sm">
      {build.status === 'ready' && (
        <Button
          color="sage"
          leftSection={<IconCheck size={16} />}
          loading={busy === 'validate'}
          onClick={async () => {
            setBusy('validate');
            try {
              await api.drafts.validateBuild(draft.id, build.id);
              notifySuccess('Site validé', draft.answers.name);
            } finally {
              setBusy(null);
            }
          }}
        >
          Valider le site
        </Button>
      )}
      <Textarea
        placeholder={
          build.status === 'failed' ? 'Indication pour la nouvelle tentative (facultatif)' : 'Ce qui ne va pas : écart avec la maquette, bouton mal placé…'
        }
        autosize
        minRows={2}
        maxLength={2000}
        value={feedback}
        onChange={(e) => setFeedback(e.currentTarget.value)}
      />
      <Button
        variant={build.status === 'failed' ? 'filled' : 'light'}
        leftSection={<IconRefresh size={16} />}
        disabled={build.status !== 'failed' && !feedback.trim()}
        loading={busy === 'changes'}
        onClick={requestChanges}
      >
        {build.status === 'failed' ? 'Relancer le développement' : 'Demander une modification'}
      </Button>
      <Text size="xs" c="dimmed">
        Coût total du développement : {usd(draft.builds.reduce((s, b) => s + (b.usage?.costUsd ?? 0), 0))}
      </Text>
    </Stack>
  );
}

/** Mise en ligne du site validé : GitHub, puis Vercel. */
function DeliveryStatus({ draft }: { draft: SiteDraft }) {
  const d = draft.delivery;
  const [busy, setBusy] = useState(false);
  if (!d) return null;
  const links = (
    <Stack gap={4} mt="xs">
      {d.repoUrl && (
        <Anchor href={d.repoUrl} target="_blank" rel="noopener" size="sm">
          <Group gap={6}>
            <IconBrandGithub size={14} /> Code sur GitHub
          </Group>
        </Anchor>
      )}
      {d.siteUrl && (
        <Anchor href={d.siteUrl} target="_blank" rel="noopener" size="sm">
          <Group gap={6}>
            <IconWorld size={14} /> {d.siteUrl.replace(/^https:\/\//, '')}
          </Group>
        </Anchor>
      )}
    </Stack>
  );
  if (d.status === 'live')
    return (
      <Stack gap="sm">
        <Alert color="sage" variant="light" icon={<IconCheck size={18} />} title={d.simulated ? 'En ligne (simulé)' : 'Site en ligne'}>
          Déployé {d.completedAt ? fromNow(d.completedAt) : ''} sur Vercel.
          {links}
        </Alert>
        <DomainStep draft={draft} />
      </Stack>
    );
  if (d.status === 'failed')
    return (
      <Stack gap="sm">
        <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />} title="Mise en ligne en échec">
          {d.error}
          {links}
        </Alert>
        <Button
          leftSection={<IconRefresh size={16} />}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api.drafts.retryDelivery(draft.id);
              notifySuccess('Mise en ligne relancée', draft.answers.name);
            } finally {
              setBusy(false);
            }
          }}
        >
          Relancer la mise en ligne
        </Button>
      </Stack>
    );
  return (
    <Alert color="blue" variant="light" icon={<Loader size={16} />} title="Mise en ligne en cours">
      {d.status === 'github' ? 'Envoi du code sur GitHub…' : 'Déploiement sur Vercel (1 à 3 minutes)…'}
      {links}
    </Alert>
  );
}

/** Nom du dépôt GitHub (et du projet Vercel) : pré-rempli, modifiable tant que le dépôt n'existe pas. */
function RepoNameCard({ draft }: { draft: SiteDraft }) {
  const current = repoNameOf(draft);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const locked = !!draft.delivery?.repoUrl;
  const normalized = value.trim().toLowerCase();
  const invalid = normalized !== current && (!REPO_NAME_RE.test(normalized) || normalized.includes('--'));

  return (
    <SectionCard title="Dépôt GitHub" subtitle={locked ? 'Créé : le nom ne peut plus être modifié ici' : 'Utilisé aussi pour le projet Vercel'} icon={<IconBrandGithub size={18} />}>
      <Group gap="xs" align="flex-start" wrap="nowrap">
        <TextInput
          style={{ flex: 1 }}
          leftSection={<Text size="xs" c="dimmed" pl={6}>Yumco-customers/</Text>}
          leftSectionWidth={128}
          value={value}
          disabled={locked}
          onChange={(e) => setValue(e.currentTarget.value)}
          error={invalid ? 'Minuscules, chiffres et tirets (3 à 80 caractères)' : undefined}
        />
        {!locked && normalized !== current && (
          <Button
            loading={saving}
            disabled={invalid}
            onClick={async () => {
              setSaving(true);
              try {
                await api.drafts.setRepoName(draft.id, normalized);
                setValue(normalized);
                notifySuccess('Nom du dépôt enregistré', normalized);
              } finally {
                setSaving(false);
              }
            }}
          >
            Enregistrer
          </Button>
        )}
      </Group>
    </SectionCard>
  );
}

/**
 * Dernière étape : brancher le domaine officiel acheté (dans Vercel), le renseigner
 * (détection automatique ou saisie), puis valider pour créer le restaurant.
 */
function DomainStep({ draft }: { draft: SiteDraft }) {
  const navigate = useNavigate();
  const domain = draft.delivery?.customDomain ?? null;
  const [value, setValue] = useState(domain ?? '');
  const [busy, setBusy] = useState<null | 'detect' | 'save' | 'finalize'>(null);
  const act = async (kind: 'detect' | 'save' | 'finalize', fn: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card withBorder>
      <Stack gap="sm">
        <Text fw={650}>Domaine officiel</Text>
        <Text size="xs" c="dimmed">
          Ajoutez le domaine acheté au projet Vercel « {repoNameOf(draft)} » (Settings → Domains), configurez les DNS, puis récupérez-le ici ou saisissez-le.
        </Text>
        <Button
          variant="light"
          leftSection={<IconWorld size={16} />}
          loading={busy === 'detect'}
          onClick={() =>
            act('detect', async () => {
              const d = await api.drafts.detectDomain(draft.id);
              setValue(d.customDomain ?? '');
              notifySuccess('Domaine récupéré', d.customDomain ?? '');
            })
          }
        >
          Récupérer depuis Vercel
        </Button>
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <TextInput style={{ flex: 1 }} placeholder="www.restaurant.fr" value={value} onChange={(e) => setValue(e.currentTarget.value)} />
          <Button
            variant="default"
            disabled={!value.trim() || value.trim().toLowerCase() === domain}
            loading={busy === 'save'}
            onClick={() =>
              act('save', async () => {
                const d = await api.drafts.setDomain(draft.id, value);
                setValue(d.customDomain ?? '');
                notifySuccess('Domaine enregistré', d.customDomain ?? '');
              })
            }
          >
            Enregistrer
          </Button>
        </Group>
        {domain && (
          <Anchor href={`https://${domain}`} target="_blank" rel="noopener" size="sm">
            Vérifier https://{domain}
          </Anchor>
        )}
        <Button
          color="sage"
          leftSection={<IconCheck size={16} />}
          disabled={!domain}
          loading={busy === 'finalize'}
          onClick={() =>
            act('finalize', async () => {
              const r = await api.drafts.finalize(draft.id);
              notifySuccess(
                'Processus terminé',
                draft.yumcoRestaurantId ? `${r.name} est actif : accès envoyés à ${draft.answers.manager.email}.` : `${r.name} est maintenant un restaurant actif.`,
              );
              navigate(paths.restaurant(r.id));
            })
          }
        >
          {draft.yumcoRestaurantId ? 'Valider et envoyer les accès au gérant' : 'Valider et créer le restaurant'}
        </Button>
        {draft.yumcoRestaurantId && (
          <Text size="xs" c="dimmed">
            {draft.answers.manager.email} reçoit le lien du site et un mot de passe provisoire pour l’application Yumco.
          </Text>
        )}
        {!domain && (
          <Text size="xs" c="dimmed">
            Le domaine officiel est requis pour valider.
          </Text>
        )}
      </Stack>
    </Card>
  );
}
