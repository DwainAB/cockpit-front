import { Button, Card, Center, Code, Group, Loader, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconPlugConnectedX } from '@tabler/icons-react';
import { useEffect, type ReactNode } from 'react';
import { useConnection } from '@/api/connection';
import { connect } from '@/api/sync';

/** Charge les données depuis l'API avant d'afficher l'application. */
export function DataGate({ children }: { children: ReactNode }) {
  const { mode, status, error, set } = useConnection();

  useEffect(() => {
    if (mode !== 'http') return;
    return connect();
  }, [mode]);

  if (status === 'ready') return <>{children}</>;

  return (
    <Center mih="100dvh" p="md">
      {status === 'connecting' ? (
        <Stack align="center" gap="sm">
          <Loader />
          <Text c="dimmed" size="sm">
            Connexion à l’API…
          </Text>
        </Stack>
      ) : (
        <Card maw={480} w="100%">
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon color="red" variant="light" size={40} radius="xl">
                <IconPlugConnectedX size={22} />
              </ThemeIcon>
              <div>
                <Text fw={650}>API injoignable</Text>
                <Text size="sm" c="dimmed">
                  {error}
                </Text>
              </div>
            </Group>
            <Text size="sm">
              Démarrez le backend avec <Code>npm run dev:backend</Code> (ou <Code>npm run dev</Code> à la racine), puis réessayez.
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => set({ mode: 'mock', status: 'ready', error: null })}>
                Continuer en mode démo local
              </Button>
              <Button onClick={() => connect()}>Réessayer</Button>
            </Group>
          </Stack>
        </Card>
      )}
    </Center>
  );
}
