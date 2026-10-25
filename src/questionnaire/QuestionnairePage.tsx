import { Alert, Center, Container, Loader, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCircleCheck, IconLinkOff } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { QuestionnaireForm } from '@/components/questionnaire/QuestionnaireForm';
import { notifyError } from '@/lib/notify';
import { PublicApiError, publicApi } from './publicApi';

type State = { kind: 'loading' } | { kind: 'open'; recipientEmail: string | null } | { kind: 'closed'; message: string } | { kind: 'sent'; managerEmail: string };

const token = new URLSearchParams(window.location.search).get('t') ?? '';

/** Questionnaire ouvert depuis le lien reçu par e-mail. À l'envoi, le restaurant est créé chez Yumco. */
export function QuestionnairePage() {
  const [state, setState] = useState<State>(token ? { kind: 'loading' } : { kind: 'closed', message: 'Ce lien est incomplet. Ouvrez-le directement depuis l’e-mail reçu.' });

  useEffect(() => {
    if (!token) return;
    publicApi
      .open(token)
      .then((r) => setState({ kind: 'open', recipientEmail: r.recipient_email }))
      .catch((err: Error) => setState({ kind: 'closed', message: err.message }));
  }, []);

  const uploadImage = async (file: File) => {
    try {
      return await publicApi.uploadImage(token, file);
    } catch (err) {
      notifyError('Envoi de l’image impossible', (err as Error).message);
      throw err;
    }
  };

  return (
    <Container size="md" py={{ base: 'lg', sm: 48 }} px="md">
      <Stack gap="lg">
        <Stack gap={6}>
          <Text fw={700} c="night" size="sm" tt="uppercase" style={{ letterSpacing: 1 }}>
            Yumco
          </Text>
          <Title order={1} fz={{ base: 26, sm: 32 }}>
            Créons le site de votre restaurant
          </Title>
          <Text c="dimmed">
            Vos réponses nous servent à créer votre site internet et à configurer votre espace Yumco (commandes, réservations, livraison). Comptez une quinzaine de
            minutes. Vous recevrez vos accès par e-mail dès que votre site sera en ligne.
          </Text>
        </Stack>

        {state.kind === 'loading' && (
          <Center py="xl">
            <Loader />
          </Center>
        )}

        {state.kind === 'closed' && (
          <Alert color="gray" variant="light" icon={<IconLinkOff size={18} />}>
            {state.message}
          </Alert>
        )}

        {state.kind === 'sent' && (
          <Stack align="center" gap="sm" py="xl" ta="center">
            <ThemeIcon size={56} radius="xl" color="sage" variant="light">
              <IconCircleCheck size={32} />
            </ThemeIcon>
            <Title order={2}>Merci, c’est envoyé !</Title>
            <Text c="dimmed" maw={480}>
              Nous préparons votre site. Dès qu’il est en ligne, vous recevrez à {state.managerEmail} le lien du site et vos accès à l’application Yumco pour ajouter vos
              plats.
            </Text>
          </Stack>
        )}

        {state.kind === 'open' && (
          <QuestionnaireForm
            submitLabel="Envoyer le questionnaire"
            initialManagerEmail={state.recipientEmail ?? ''}
            uploadImage={uploadImage}
            onSubmit={async (answers) => {
              try {
                await publicApi.submit(token, answers);
                setState({ kind: 'sent', managerEmail: answers.manager.email });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } catch (err) {
                if (err instanceof PublicApiError && err.status === 410) setState({ kind: 'closed', message: err.message });
                else notifyError('Envoi impossible', (err as Error).message);
                throw err;
              }
            }}
          />
        )}
      </Stack>
    </Container>
  );
}
