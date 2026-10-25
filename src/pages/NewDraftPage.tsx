import { Card, Group, SegmentedControl, Text } from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths, subscriptionPlanKeys, subscriptionPlans, type SubscriptionPlan } from '@/core';
import { api } from '@/api';
import { QuestionnaireForm } from '@/components/questionnaire/QuestionnaireForm';
import { PageHeader } from '@/components/ui';
import { notifyError, notifySuccess } from '@/lib/notify';

/** Questionnaire rempli depuis le cockpit. L'envoi crée le restaurant avec l'offre choisie et lance la génération du design. */
export default function NewDraftPage() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);

  const planPicker = (
    <Card>
      <Text fw={650} size="lg">
        Offre du restaurant <Text span c="red">*</Text>
      </Text>
      <Text size="sm" c="dimmed" mb="sm">
        Enregistrée sur le restaurant dès l’envoi du questionnaire. La facturation reste gérée à la main.
      </Text>
      <SegmentedControl
        fullWidth
        value={plan ?? ''}
        onChange={(p) => setPlan(p as SubscriptionPlan)}
        data={subscriptionPlanKeys.map((p) => ({ value: p, label: subscriptionPlans[p].label }))}
      />
      <Group mt={6} gap={4}>
        <Text size="xs" c={plan ? 'dimmed' : 'red'}>
          {plan ? subscriptionPlans[plan].description : 'Choisissez l’offre avant de valider.'}
        </Text>
      </Group>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Nouveau formulaire"
        description="Une fois validé, le restaurant est créé dans Yumco, le dossier apparaît dans Production des sites, colonne « En attente », puis l’agent webdesign prépare la maquette."
      />
      <QuestionnaireForm
        header={planPicker}
        submitLabel="Valider"
        uploadImage={api.uploads.image}
        onSubmit={async (answers) => {
          if (!plan) {
            notifyError('Offre manquante', 'Choisissez l’offre du restaurant (Starter, Pro AI ou Business AI).');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          const draft = await api.drafts.create(plan, answers);
          notifySuccess('Formulaire validé', `${draft.answers.name} (${subscriptionPlans[plan].label}) est en attente de prise en charge par l’agent webdesign.`);
          navigate(paths.production());
        }}
      />
    </>
  );
}
