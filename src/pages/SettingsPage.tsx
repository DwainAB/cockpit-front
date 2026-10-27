import { Badge, Box, Button, Card, Group, NumberInput, SimpleGrid, Slider, Stack, Switch, Tabs, Text, TextInput } from '@mantine/core';
import { IconBell, IconBolt, IconBrandFacebook, IconBrandInstagram, IconBrandLinkedin, IconBrandTiktok, IconPlugConnectedX, IconRobot, IconUser, IconWallet } from '@tabler/icons-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Settings } from '@/core';
import { SiteAgentsFields } from '@/components/domain/SiteAgentsFields';
import { PageHeader } from '@/components/ui';
import { notifyInfo, notifySuccess } from '@/lib/notify';
import { api } from '@/api';
import { useStore } from '@/store';

const socials = [
  { key: 'instagram', label: 'Instagram', icon: IconBrandInstagram, color: '#C13584' },
  { key: 'linkedin', label: 'LinkedIn', icon: IconBrandLinkedin, color: '#0A66C2' },
  { key: 'facebook', label: 'Facebook', icon: IconBrandFacebook, color: '#1877F2' },
  { key: 'tiktok', label: 'TikTok', icon: IconBrandTiktok, color: '#111111' },
];

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'profile';
  const settings = useStore((s) => s.settings);
  const projects = useStore((s) => s.projects);
  const [profile, setProfile] = useState(settings.profile);
  const [budget, setBudget] = useState(settings.budget);

  const setNotif = (k: keyof Settings['notifications']) => api.settings.update({ notifications: { ...settings.notifications, [k]: !settings.notifications[k] } });

  return (
    <>
      <PageHeader title="Paramètres" description="Réglages enregistrés par l’API du cockpit. Aucun service externe (réseaux sociaux, e-mail, Stripe) n’est connecté." />
      <Tabs value={tab} onChange={(v) => setParams(v && v !== 'profile' ? { tab: v } : {})} variant="outline" radius="md">
        <Tabs.List mb="lg" style={{ flexWrap: 'wrap' }}>
          <Tabs.Tab value="profile" leftSection={<IconUser size={15} />}>Profil</Tabs.Tab>
          <Tabs.Tab value="agents" leftSection={<IconRobot size={15} />}>Agents IA</Tabs.Tab>
          <Tabs.Tab value="notifications" leftSection={<IconBell size={15} />}>Notifications</Tabs.Tab>
          <Tabs.Tab value="socials" leftSection={<IconBrandInstagram size={15} />}>Réseaux sociaux</Tabs.Tab>
          <Tabs.Tab value="automations" leftSection={<IconBolt size={15} />}>Automatisations</Tabs.Tab>
          <Tabs.Tab value="budget" leftSection={<IconWallet size={15} />}>Budget et limites</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile">
          <Card maw={640}>
            <Stack>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput label="Nom" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.currentTarget.value })} />
                <TextInput label="Fonction" value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.currentTarget.value })} />
                <TextInput label="E-mail" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.currentTarget.value })} />
                <TextInput label="Fuseau horaire" value={profile.timezone} disabled />
              </SimpleGrid>
              <Group justify="flex-end">
                <Button
                  onClick={async () => {
                    await api.settings.update({ profile });
                    notifySuccess('Profil enregistré');
                  }}
                >
                  Enregistrer
                </Button>
              </Group>
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="agents">
          <Card maw={720}>
            <Stack gap="lg">
              <Text size="sm" c="dimmed">
                Flux de création de site : chaque tâche est réalisée par l’agent choisi, avec son modèle « Tâches » (réglable sur la page Agents). Le changement s’applique aux
                prochaines générations. Également modifiable depuis la page Production des sites.
              </Text>
              <SiteAgentsFields />
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="notifications">
          <Card maw={640}>
            <Stack>
              <Switch checked={settings.notifications.validations} onChange={() => setNotif('validations')} label="Éléments à valider" description="Maquettes, visuels, sujets éditoriaux." />
              <Switch checked={settings.notifications.alerts} onChange={() => setNotif('alerts')} label="Alertes des agents" description="Tests en échec, publications en erreur, blocages." />
              <Switch checked={settings.notifications.weeklyReport} onChange={() => setNotif('weeklyReport')} label="Rapport hebdomadaire" description="Synthèse envoyée chaque vendredi (simulé, aucun e-mail réel)." />
              <Switch checked={settings.notifications.publications} onChange={() => setNotif('publications')} label="Confirmations de publication" />
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="socials">
          <Stack gap="lg">
            {projects.map((p) => (
              <div key={p.id}>
                <Group gap={8} mb="sm">
                  <Box w={10} h={10} style={{ borderRadius: 3, background: p.color }} />
                  <Text fw={650}>{p.name}</Text>
                </Group>
                <SimpleGrid cols={{ base: 2, sm: 4 }}>
                  {socials.map(({ key, label, icon: Icon, color }) => (
                    <Card key={key} padding="sm">
                      <Group gap="xs" wrap="nowrap" mb="xs">
                        <Icon size={20} color={color} />
                        <Text size="sm" fw={600}>
                          {label}
                        </Text>
                      </Group>
                      <Badge color="gray" variant="light" leftSection={<IconPlugConnectedX size={12} />} tt="none" mb="xs">
                        Non connecté
                      </Badge>
                      <Button variant="default" size="xs" fullWidth onClick={() => notifyInfo('Configuration simulée', `La connexion ${label} de ${p.name} n’est pas disponible dans cette version.`)}>
                        Configurer
                      </Button>
                    </Card>
                  ))}
                </SimpleGrid>
              </div>
            ))}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="automations">
          <Stack gap="sm" maw={820}>
            {settings.automations.map((a) => (
              <Card key={a.id} padding="md">
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <div>
                    <Group gap="xs">
                      <Text fw={600}>{a.name}</Text>
                      <Badge size="xs" variant="light" color="gray" tt="none">
                        {a.schedule}
                      </Badge>
                      <Badge size="xs" variant="dot" color={projects.find((p) => p.id === a.projectId)?.color ?? 'grape'} tt="none">
                        {projects.find((p) => p.id === a.projectId)?.name ?? 'Tous les projets'}
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {a.description}
                    </Text>
                  </div>
                  <Switch
                    checked={a.enabled}
                    onChange={async () => {
                      await api.settings.toggleAutomation(a.id);
                      notifyInfo(a.enabled ? 'Automatisation désactivée' : 'Automatisation activée', `${a.name} (simulation).`);
                    }}
                    aria-label={a.name}
                  />
                </Group>
              </Card>
            ))}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="budget">
          <Card maw={640}>
            <Stack gap="lg">
              <NumberInput label="Budget IA mensuel (€)" min={0} step={10} value={budget.monthlyLimit} onChange={(v) => setBudget({ ...budget, monthlyLimit: Number(v) || 0 })} />
              <NumberInput
                label="Générations maximum par contenu"
                description="Au-delà, une validation supplémentaire est demandée."
                min={1}
                max={10}
                value={budget.maxGenerationsPerContent}
                onChange={(v) => setBudget({ ...budget, maxGenerationsPerContent: Number(v) || 1 })}
              />
              <div>
                <Text size="sm" fw={500}>
                  Seuil d’alerte budget : {budget.alertThreshold} %
                </Text>
                <Slider mt="xs" min={50} max={100} step={5} value={budget.alertThreshold} onChange={(v) => setBudget({ ...budget, alertThreshold: v })} marks={[{ value: 50, label: '50 %' }, { value: 80, label: '80 %' }, { value: 100, label: '100 %' }]} />
              </div>
              <Group justify="flex-end" mt="md">
                <Button
                  onClick={async () => {
                    await api.settings.update({ budget });
                    notifySuccess('Limites enregistrées', 'Appliquées au tableau de bord et aux contenus.');
                  }}
                >
                  Enregistrer
                </Button>
              </Group>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

