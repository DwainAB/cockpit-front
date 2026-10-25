import { Alert, Button, Card, Loader, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

/** Chargement ou erreur d'une donnée lue dans Yumco. */
export function RemoteState({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  if (loading)
    return (
      <Card>
        <Stack align="center" py="xl" gap="xs">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Lecture dans Yumco…
          </Text>
        </Stack>
      </Card>
    );
  return (
    <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />} title="Lecture impossible">
      {error}
      <Button mt="sm" size="xs" variant="light" color="red" onClick={onRetry} display="block">
        Réessayer
      </Button>
    </Alert>
  );
}
