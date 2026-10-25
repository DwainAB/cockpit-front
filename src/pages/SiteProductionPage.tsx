import { Badge, Button, Card, Group, Menu, SegmentedControl, Stack, Text, TextInput } from '@mantine/core';
import { IconAlertTriangle, IconChevronDown, IconClock, IconForms, IconMail, IconPlus, IconSearch, IconUserCheck } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { currentBuild, draftStage, fromNow, paths, productionStages, type SiteBuild, type SiteDraft } from '@/core';
import { SendQuestionnaireModal } from '@/components/modals/SendQuestionnaireModal';
import { AgentChip, EmptyState, KanbanBoard, PageHeader } from '@/components/ui';
import { useStore } from '@/store';

type Filter = 'all' | 'review' | 'failed';

/** Une maquette ou un site attend ma validation. */
const needsReview = (d: SiteDraft) => d.versions.at(-1)?.status === 'ready' || currentBuild(d)?.status === 'ready';
const hasFailed = (d: SiteDraft) => d.versions.at(-1)?.status === 'failed' || currentBuild(d)?.status === 'failed';

/**
 * Tableau de production : chaque formulaire rempli avance de colonne en colonne
 * (en attente → maquette en préparation → maquette à valider → étapes suivantes).
 */
export default function SiteProductionPage() {
  const allDrafts = useStore((s) => s.drafts);
  const drafts = useMemo(() => allDrafts.filter((d) => !d.finalizedAt), [allDrafts]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sending, setSending] = useState(false);

  const items = useMemo(
    () =>
      drafts.filter(
        (d) =>
          (!q || `${d.answers.name} ${d.answers.restaurantType}`.toLowerCase().includes(q.toLowerCase())) &&
          (filter === 'all' || (filter === 'review' ? needsReview(d) : hasFailed(d))),
      ),
    [drafts, q, filter],
  );
  const toReview = drafts.filter(needsReview).length;
  const failed = drafts.filter(hasFailed).length;

  return (
    <>
      <SendQuestionnaireModal opened={sending} onClose={() => setSending(false)} />
      <PageHeader
        title="Production des sites"
        description="Chaque formulaire rempli apparaît ici et avance automatiquement. Cliquez sur une maquette à valider pour voir l’aperçu."
        actions={
          <Menu position="bottom-end" width={250}>
            <Menu.Target>
              <Button leftSection={<IconPlus size={16} />} rightSection={<IconChevronDown size={14} />}>
                Nouveau site
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconMail size={16} />} onClick={() => setSending(true)}>
                Envoyer le formulaire
              </Menu.Item>
              <Menu.Item leftSection={<IconForms size={16} />} component={Link} to={paths.newDraft()}>
                Remplir le formulaire
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        }
      />
      {drafts.length ? (
        <>
          <Group mb="md" gap="sm" wrap="wrap">
            <TextInput
              placeholder="Rechercher un restaurant"
              leftSection={<IconSearch size={16} />}
              value={q}
              onChange={(e) => setQ(e.currentTarget.value)}
              w={{ base: '100%', sm: 260 }}
            />
            <SegmentedControl
              value={filter}
              onChange={(v) => setFilter(v as Filter)}
              data={[
                { value: 'all', label: `Tous (${drafts.length})` },
                { value: 'review', label: `À valider (${toReview})` },
                { value: 'failed', label: `En échec (${failed})` },
              ]}
            />
          </Group>
          <KanbanBoard
            columns={productionStages}
            items={items}
            getColumn={draftStage}
            getKey={(d) => d.id}
            highlightColumns={['mockup_review', 'site_review']}
            renderCard={(d) => <DraftCard d={d} />}
          />
        </>
      ) : (
        <Card>
          <EmptyState
            icon={<IconForms size={24} />}
            title="Aucun site en production"
            description="Remplissez un formulaire : il apparaîtra dans « En attente », puis l’agent webdesign préparera la maquette."
            action={
              <Button component={Link} to={paths.newDraft()} leftSection={<IconForms size={16} />}>
                Remplir le formulaire
              </Button>
            }
          />
        </Card>
      )}
    </>
  );
}

function DraftCard({ d }: { d: SiteDraft }) {
  const v = d.versions.at(-1)!;
  const build = v.status === 'validated' ? currentBuild(d) : undefined;
  const concept = [...d.versions].reverse().find((x) => x.concept)?.concept;
  return (
    <Card
      component={Link}
      to={paths.draft(d.id)}
      padding="sm"
      radius="md"
      className="hover-lift"
      style={{ textDecoration: 'none', borderLeft: `3px solid ${concept?.palette[0] ?? d.answers.branding.colors[0] ?? 'var(--mantine-color-night-3)'}` }}
    >
      <Stack gap={8}>
        <div>
          <Text size="sm" fw={650}>
            {d.answers.name}
          </Text>
          <Text size="xs" c="dimmed">
            {d.answers.restaurantType}
            {d.versions.length > 1 && ` · version ${v.number}`}
          </Text>
        </div>
        <AgentChip agentId={build ? 'agent-dev' : 'agent-design'} size="xs" />
        {v.status === 'failed' && (
          <Badge
            color="red"
            variant="light"
            tt="none"
            leftSection={<IconAlertTriangle size={12} />}
            styles={{ root: { height: 'auto', whiteSpace: 'normal', padding: '4px 8px' } }}
          >
            Échec : {v.error}
          </Badge>
        )}
        {v.status === 'ready' && (
          <Badge color="night" variant="filled" tt="none" leftSection={<IconUserCheck size={12} />}>
            Maquette à valider
          </Badge>
        )}
        {build && (build.status === 'validated' && d.delivery ? <DeliveryBadge d={d} /> : <BuildBadge build={build} />)}
        {v.status === 'generating' && v.feedback && (
          <Text size="xs" c="dimmed" lineClamp={2}>
            Modification : « {v.feedback} »
          </Text>
        )}
        <Group gap={4} c="dimmed">
          <IconClock size={12} />
          <Text size="xs">Mis à jour {fromNow(d.updatedAt)}</Text>
        </Group>
      </Stack>
    </Card>
  );
}

function BuildBadge({ build }: { build: SiteBuild }) {
  const wrap = { root: { height: 'auto', whiteSpace: 'normal' as const, padding: '4px 8px' } };
  if (build.status === 'failed')
    return (
      <Badge color="red" variant="light" tt="none" leftSection={<IconAlertTriangle size={12} />} styles={wrap}>
        Échec : {build.error}
      </Badge>
    );
  if (build.status === 'ready')
    return (
      <Badge color="night" variant="filled" tt="none" leftSection={<IconUserCheck size={12} />}>
        Site à valider
      </Badge>
    );
  if (build.status === 'validated')
    return (
      <Badge color="sage" variant="light" tt="none" styles={wrap}>
        Site validé — livraison à venir
      </Badge>
    );
  return (
    <Text size="xs" c="dimmed">
      {build.status === 'testing'
        ? 'Compilation et tests en cours…'
        : build.status === 'building'
          ? `L’agent développeur code le site${build.attempts > 1 ? ` (correction ${build.attempts})` : ''}…`
          : 'En attente de l’agent développeur'}
    </Text>
  );
}

function DeliveryBadge({ d }: { d: SiteDraft }) {
  const delivery = d.delivery!;
  if (delivery.status === 'live')
    return (
      <Badge color="sage" variant="light" tt="none">
        En ligne
      </Badge>
    );
  if (delivery.status === 'failed')
    return (
      <Badge color="red" variant="light" tt="none" leftSection={<IconAlertTriangle size={12} />} styles={{ root: { height: 'auto', whiteSpace: 'normal', padding: '4px 8px' } }}>
        Mise en ligne en échec
      </Badge>
    );
  return (
    <Text size="xs" c="dimmed">
      {delivery.status === 'github' ? 'Envoi sur GitHub…' : 'Déploiement Vercel…'}
    </Text>
  );
}
