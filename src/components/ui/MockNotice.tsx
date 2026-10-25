import { Alert } from '@mantine/core';
import { IconFlask } from '@tabler/icons-react';
import type { ReactNode } from 'react';

/** Bandeau rappelant que les données affichées sont fictives. */
export function MockNotice({ children }: { children?: ReactNode }) {
  return (
    <Alert variant="light" color="orange" icon={<IconFlask size={18} />} radius="md" py="xs" mb="lg">
      {children ?? 'Données fictives — intégrations non connectées.'}
    </Alert>
  );
}
