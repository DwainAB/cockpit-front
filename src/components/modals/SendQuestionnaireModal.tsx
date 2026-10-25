import { ActionIcon, Badge, Button, CopyButton, Divider, Group, Loader, Modal, SimpleGrid, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { IconCheck, IconCopy, IconLink, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { fromNow, subscriptionPlanKeys, subscriptionPlans, type Invitation, type SubscriptionPlan } from '@/core';
import { api } from '@/api';
import { notifySuccess } from '@/lib/notify';

const statusMeta: Record<Invitation['status'], { label: string; color: string }> = {
  pending: { label: 'En attente de réponse', color: 'yellow' },
  submitted: { label: 'Rempli, en cours d’import', color: 'blue' },
  imported: { label: 'Rempli', color: 'sage' },
  cancelled: { label: 'Annulé', color: 'gray' },
};

const emailRe = /^\S+@\S+\.\S+$/;

/**
 * Liens de questionnaire : un bouton par offre crée un lien neuf, à usage unique. Le restaurant sera créé avec cette offre
 * quand le restaurateur aura rempli le questionnaire. Avec une adresse, le lien part aussi par e-mail.
 */
export function SendQuestionnaireModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<SubscriptionPlan | null>(null);
  const [created, setCreated] = useState<{ url: string; plan: SubscriptionPlan; sentTo: string | null; emailError: string | null } | null>(null);
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const load = () =>
    api.invitations
      .list()
      .then((list) => {
        setInvitations(list);
        setListError(null);
      })
      .catch((err: Error) => setListError(err.message));

  useEffect(() => {
    if (!opened) return;
    setCreated(null);
    setInvitations(null);
    void load();
  }, [opened]);

  const emailValue = email.trim();
  const emailInvalid = Boolean(emailValue) && !emailRe.test(emailValue);

  const create = async (plan: SubscriptionPlan) => {
    setBusy(plan);
    try {
      const res = await api.invitations.create(plan, emailValue || null);
      setCreated({ url: res.url, plan, sentTo: res.email_sent ? emailValue : null, emailError: res.email_error });
      if (res.email_sent) notifySuccess('Questionnaire envoyé', `Lien ${subscriptionPlans[plan].label} envoyé à ${emailValue}.`);
      setEmail('');
      void load();
    } catch {
      // Erreur déjà notifiée.
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Envoyer le questionnaire" size="lg">
      <Stack>
        <Text size="sm" c="dimmed">
          Choisissez l’offre du restaurant : chaque bouton crée un lien neuf, utilisable une seule fois. À l’envoi du questionnaire, le restaurant est créé avec cette
          offre et le design démarre automatiquement.
        </Text>
        <TextInput
          label="E-mail du restaurateur"
          description="Facultatif : le lien lui est envoyé par e-mail. Sinon, copiez-le et envoyez-le vous-même."
          placeholder="contact@restaurant.fr"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          error={emailInvalid ? 'Adresse e-mail invalide' : undefined}
        />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          {subscriptionPlanKeys.map((plan) => (
            <Button key={plan} variant="light" leftSection={<IconLink size={16} />} loading={busy === plan} disabled={emailInvalid || (busy !== null && busy !== plan)} onClick={() => create(plan)}>
              Lien {subscriptionPlans[plan].label}
            </Button>
          ))}
        </SimpleGrid>

        {created && (
          <Stack gap={6} p="sm" style={{ border: '1px solid var(--app-border)', borderRadius: 8 }}>
            <Text size="sm" fw={600}>
              Lien {subscriptionPlans[created.plan].label} {created.sentTo ? `envoyé à ${created.sentTo}` : 'prêt à envoyer'}
            </Text>
            <Group gap="xs" wrap="nowrap">
              <TextInput readOnly value={created.url} style={{ flex: 1 }} onFocus={(e) => e.currentTarget.select()} />
              <CopyButton value={created.url}>
                {({ copied, copy }) => (
                  <Button variant={copied ? 'filled' : 'default'} color={copied ? 'sage' : undefined} leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />} onClick={copy}>
                    {copied ? 'Copié' : 'Copier'}
                  </Button>
                )}
              </CopyButton>
            </Group>
            {created.emailError && (
              <Text size="xs" c="red">
                L’e-mail n’est pas parti ({created.emailError}). Copiez le lien et envoyez-le vous-même.
              </Text>
            )}
          </Stack>
        )}

        <Divider label="Liens envoyés" labelPosition="left" />
        {listError ? (
          <Text size="sm" c="red">
            {listError}
          </Text>
        ) : !invitations ? (
          <Group justify="center">
            <Loader size="sm" />
          </Group>
        ) : !invitations.length ? (
          <Text size="sm" c="dimmed">
            Aucun lien pour l’instant.
          </Text>
        ) : (
          <Stack gap={6} mah={260} style={{ overflowY: 'auto' }}>
            {invitations.map((inv) => (
              <Group key={inv.id} gap="xs" wrap="nowrap" justify="space-between">
                <Stack gap={0} style={{ minWidth: 0 }}>
                  <Text size="sm" truncate>
                    {inv.restaurant_name ?? inv.recipient_email ?? `Lien n° ${inv.id}`}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {subscriptionPlans[inv.subscription_plan].label} · créé {fromNow(inv.created_at)}
                    {inv.status === 'pending' && new Date(inv.expires_at) < new Date() ? ' · expiré' : ''}
                  </Text>
                </Stack>
                <Group gap={4} wrap="nowrap">
                  <Badge variant="light" color={statusMeta[inv.status].color} tt="none">
                    {statusMeta[inv.status].label}
                  </Badge>
                  {inv.status === 'pending' && (
                    <Tooltip label="Annuler ce lien">
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        aria-label="Annuler ce lien"
                        onClick={() =>
                          api.invitations
                            .cancel(inv.id)
                            .then(load)
                            .catch(() => undefined)
                        }
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Group>
            ))}
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
