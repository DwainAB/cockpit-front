import { Button, Chip, Group, Select, Stack, Switch, Text } from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { IconCalendarEvent, IconMessageCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dayjs, editorialPlanOf, type EditorialPlan, networkLabel, paths, POST_NETWORKS, type Project, specialtyLabel, weekKey } from '@/core';
import { api } from '@/api';
import { SectionCard } from '@/components/ui';
import { notifySuccess } from '@/lib/notify';
import { useStore } from '@/store';

const DAYS = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ value: String(d), label: dayjs().isoWeekday(d).format('ddd') }));
const dayOptions = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ value: String(d), label: dayjs().isoWeekday(d).format('dddd') }));

/** Planning des posts d'un projet : jours de publication, réseaux, agent et discussion hebdomadaire. */
export function EditorialPlanCard({ project }: { project: Project }) {
  const plan = editorialPlanOf(project);
  const agents = useStore((s) => s.agents);
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const agent = agents.find((a) => a.id === plan.agentId);

  const save = (patch: Partial<EditorialPlan>) => void api.projects.updateEditorial(project.id, patch);
  const open = async () => {
    setOpening(true);
    try {
      const conv = await api.projects.startBrief(project.id);
      navigate(paths.discussions(conv.id, project.id));
    } finally {
      setOpening(false);
    }
  };

  return (
    <SectionCard title="Planning des posts" subtitle="L’agent prépare chaque semaine les posts avec vous" icon={<IconCalendarEvent size={18} />}>
      <Stack gap="sm">
        <Switch
          label="Planning actif"
          description={plan.enabled ? `${agent?.name ?? 'L’agent'} ouvre la discussion chaque ${dayjs().isoWeekday(plan.briefDay).format('dddd')} à ${plan.briefTime}.` : 'Activez-le pour recevoir les propositions chaque semaine.'}
          checked={plan.enabled}
          onChange={(e) => save({ enabled: e.currentTarget.checked })}
        />
        <div>
          <Text size="sm" fw={500} mb={4}>
            Jours de publication
          </Text>
          <Chip.Group multiple value={plan.days.map(String)} onChange={(v) => v.length && save({ days: v.map(Number) })}>
            <Group gap={4}>
              {DAYS.map((d) => (
                <Chip key={d.value} value={d.value} size="xs" variant="light">
                  {d.label}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </div>
        <TimeInput label="Heure de publication" value={plan.time} onChange={(e) => e.currentTarget.value && save({ time: e.currentTarget.value })} w={140} />
        <div>
          <Text size="sm" fw={500} mb={4}>
            Réseaux
          </Text>
          <Chip.Group multiple value={plan.networks} onChange={(v) => v.length && save({ networks: v as EditorialPlan['networks'] })}>
            <Group gap={4}>
              {POST_NETWORKS.map((n) => (
                <Chip key={n} value={n} size="xs" variant="light">
                  {networkLabel[n]}
                </Chip>
              ))}
              <Chip value="tiktok" size="xs" disabled>
                TikTok (bientôt)
              </Chip>
            </Group>
          </Chip.Group>
          <Text size="xs" c="dimmed" mt={4}>
            Texte adapté à chaque réseau + une image.
          </Text>
        </div>
        <Select
          label="Agent"
          allowDeselect={false}
          data={agents.map((a) => ({ value: a.id, label: `${a.name} — ${specialtyLabel(a.kind)}` }))}
          value={plan.agentId}
          onChange={(v) => v && save({ agentId: v })}
        />
        <Group grow align="flex-end">
          <Select label="Discussion de la semaine" allowDeselect={false} data={dayOptions} value={String(plan.briefDay)} onChange={(v) => v && save({ briefDay: Number(v) })} />
          <TimeInput value={plan.briefTime} onChange={(e) => e.currentTarget.value && save({ briefTime: e.currentTarget.value })} />
        </Group>
        <Button
          variant="light"
          leftSection={<IconMessageCircle size={16} />}
          loading={opening}
          onClick={() => {
            void open().then(() => notifySuccess('Discussion ouverte', `${agent?.name ?? 'L’agent'} prépare ses propositions.`));
          }}
        >
          {plan.lastBriefWeek === weekKey() ? 'Relancer une discussion maintenant' : 'Lancer la discussion maintenant'}
        </Button>
      </Stack>
    </SectionCard>
  );
}
