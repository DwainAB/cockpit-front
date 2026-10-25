import { Button, Card } from '@mantine/core';
import { IconError404 } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui';

export default function NotFoundPage({ what }: { what?: string }) {
  return (
    <Card maw={560} mx="auto" mt="xl">
      <EmptyState
        icon={<IconError404 size={24} />}
        title={what ? `${what} est introuvable` : 'Page introuvable'}
        description="Le lien est peut-être erroné, ou l’élément a été supprimé de la démo (les données sont réinitialisées au rechargement)."
        action={
          <Button component={Link} to="/" variant="light">
            Retour à la vue d’ensemble
          </Button>
        }
      />
    </Card>
  );
}
