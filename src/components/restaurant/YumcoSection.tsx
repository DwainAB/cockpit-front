import { IconDatabaseOff } from '@tabler/icons-react';
import { Card } from '@mantine/core';
import { useConnection } from '@/api/connection';
import { EmptyState } from '@/components/ui';
import { CatalogPanel } from './CatalogPanel';
import { OrdersPanel } from './OrdersPanel';
import { UsersPanel } from './UsersPanel';

/** Onglets lus dans Yumco : disponibles seulement avec le backend et pour un restaurant de la base Yumco. */
export function YumcoSection({ restaurantId, section }: { restaurantId: string; section: string }) {
  const mock = useConnection((s) => s.mode === 'mock');
  const yumcoId = /^yumco-(\d+)$/.exec(restaurantId)?.[1];

  if (mock || !yumcoId)
    return (
      <Card>
        <EmptyState
          icon={<IconDatabaseOff size={24} />}
          title="Données Yumco indisponibles"
          description={mock ? 'La carte, les utilisateurs et les commandes se lisent dans Yumco : démarrez le cockpit avec son backend.' : 'Ce restaurant n’est pas lié à la base Yumco.'}
        />
      </Card>
    );

  if (section === 'carte') return <CatalogPanel restaurantId={restaurantId} />;
  if (section === 'utilisateurs') return <UsersPanel restaurantId={restaurantId} yumcoRestaurantId={Number(yumcoId)} />;
  if (section === 'commandes') return <OrdersPanel restaurantId={restaurantId} />;
  return null;
}
