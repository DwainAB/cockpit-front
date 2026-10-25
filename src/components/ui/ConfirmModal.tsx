import { Button, Group, Modal, Text } from '@mantine/core';
import { useState, type ReactNode } from 'react';

interface Props {
  opened: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
}

/** Confirmation d'une action irréversible (jamais de `window.confirm`). */
export function ConfirmModal({ opened, title, message, confirmLabel, onConfirm, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <Text size="sm">{message}</Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose} disabled={busy}>
          Annuler
        </Button>
        <Button
          color="red"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } catch {
              // Erreur déjà signalée par une notification.
            } finally {
              setBusy(false);
            }
          }}
        >
          {confirmLabel}
        </Button>
      </Group>
    </Modal>
  );
}
