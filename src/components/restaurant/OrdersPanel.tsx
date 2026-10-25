import { Badge, Divider, Drawer, Group, SegmentedControl, Select, Stack, Table, Text, TextInput } from '@mantine/core';
import { DatePickerInput, type DatesRangeValue } from '@mantine/dates';
import { IconCalendar, IconReceipt, IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { yumcoApi, type OrderStatus, type YumcoOrder } from '@/api/yumco';
import { EmptyState, SectionCard, StatusBadge } from '@/components/ui';
import { dayjs, euro, fmtDateTime } from '@/core';
import { useRemote } from '@/hooks/useRemote';
import { ONGOING, orderStatus, orderType, paymentStatus } from './labels';
import { RemoteState } from './RemoteState';

const day = (d: Date | null) => (d ? dayjs(d).format('YYYY-MM-DD') : undefined);
const customerName = (o: YumcoOrder) => (o.customer ? `${o.customer.first_name} ${o.customer.last_name}`.trim() : '');

/** Commandes du restaurant (base Yumco), en cours ou passées, consultation seule. */
export function OrdersPanel({ restaurantId }: { restaurantId: string }) {
  const [period, setPeriod] = useState('ongoing');
  const [status, setStatus] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [payment, setPayment] = useState<string | null>(null);
  const [range, setRange] = useState<DatesRangeValue>([null, null]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<YumcoOrder | null>(null);

  // Statut et période filtrés par l'API ; le reste dans le navigateur.
  const [from, to] = range[0] && range[1] ? [day(range[0]), day(range[1])] : [undefined, undefined];
  const { data, loading, error, reload } = useRemote(
    () => yumcoApi.orders(restaurantId, { status: (status as OrderStatus | null) ?? undefined, date_from: from, date_to: to }),
    [restaurantId, status, from, to],
  );

  const orders = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter((o) => {
      const s = o.status ?? 'pending';
      if (!status && period === 'ongoing' && !ONGOING.includes(s)) return false;
      if (!status && period === 'past' && ONGOING.includes(s)) return false;
      if (type && o.type !== type) return false;
      if (payment && (o.payment_status ?? 'unpaid') !== payment) return false;
      return !needle || `${o.order_number} ${customerName(o)} ${o.customer?.phone ?? ''}`.toLowerCase().includes(needle);
    });
  }, [data, period, status, type, payment, q]);

  const total = orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.amount_total, 0);

  return (
    <SectionCard title="Commandes" subtitle="Consultation seule pour l’instant" icon={<IconReceipt size={18} />}>
      <Stack gap="sm" mb="md">
        <Group gap="sm" wrap="wrap">
          <SegmentedControl
            value={period}
            onChange={setPeriod}
            disabled={Boolean(status)}
            data={[
              { value: 'ongoing', label: 'En cours' },
              { value: 'past', label: 'Passées' },
              { value: 'all', label: 'Toutes' },
            ]}
          />
          <DatePickerInput
            type="range"
            placeholder="Période"
            leftSection={<IconCalendar size={16} />}
            value={range}
            onChange={setRange}
            clearable
            valueFormat="D MMM YYYY"
            w={250}
          />
        </Group>
        <Group gap="sm" wrap="wrap">
          <TextInput placeholder="N°, client, téléphone" leftSection={<IconSearch size={16} />} value={q} onChange={(e) => setQ(e.currentTarget.value)} style={{ flex: '1 1 200px' }} />
          <Select placeholder="Tous les statuts" clearable value={status} onChange={setStatus} data={Object.entries(orderStatus).map(([value, m]) => ({ value, label: m.label }))} w={180} />
          <Select placeholder="Tous les types" clearable value={type} onChange={setType} data={Object.entries(orderType).map(([value, label]) => ({ value, label }))} w={160} />
          <Select placeholder="Paiement" clearable value={payment} onChange={setPayment} data={Object.entries(paymentStatus).map(([value, m]) => ({ value, label: m.label }))} w={150} />
        </Group>
      </Stack>

      {!data ? (
        <RemoteState loading={loading} error={error} onRetry={reload} />
      ) : orders.length === 0 ? (
        <EmptyState compact title={data.length ? 'Aucune commande ne correspond aux filtres' : 'Aucune commande'} />
      ) : (
        <>
          <Text size="xs" c="dimmed" mb="xs">
            {orders.length} commande(s) · {euro(total, 2)} hors annulations
          </Text>
          <Table.ScrollContainer minWidth={720}>
            <Table verticalSpacing="xs" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>N°</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Client</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Statut</Table.Th>
                  <Table.Th>Paiement</Table.Th>
                  <Table.Th ta="right">Montant</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {orders.map((o) => (
                  <Table.Tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setOpen(o)}>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {o.order_number}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{fmtDateTime(o.created_at)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{customerName(o) || '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{orderType[o.type] ?? o.type}</Text>
                    </Table.Td>
                    <Table.Td>{o.status && orderStatus[o.status] ? <StatusBadge meta={orderStatus[o.status]} size="sm" /> : '—'}</Table.Td>
                    <Table.Td>
                      <StatusBadge meta={paymentStatus[o.payment_status === 'paid' ? 'paid' : 'unpaid']} size="sm" dot={false} />
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm" fw={600}>
                        {euro(o.amount_total, 2)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </>
      )}

      <Drawer opened={open !== null} onClose={() => setOpen(null)} position="right" title={open ? `Commande ${open.order_number}` : ''} size="md">
        {open && (
          <Stack gap="sm">
            <Group gap="xs">
              {open.status && orderStatus[open.status] && <StatusBadge meta={orderStatus[open.status]} />}
              <StatusBadge meta={paymentStatus[open.payment_status === 'paid' ? 'paid' : 'unpaid']} dot={false} />
              <Badge variant="light" color="gray" tt="none">
                {orderType[open.type] ?? open.type}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">
              Passée le {fmtDateTime(open.created_at)}
              {open.requested_time && <> · souhaitée pour {fmtDateTime(open.requested_time)}</>}
              {open.completed_at && <> · terminée le {fmtDateTime(open.completed_at)}</>}
            </Text>
            {open.customer && (
              <div>
                <Text size="sm" fw={600}>
                  {customerName(open)}
                </Text>
                <Text size="xs" c="dimmed">
                  {[open.customer.phone, open.customer.email].filter(Boolean).join(' · ')}
                </Text>
              </div>
            )}
            {open.address && (
              <Text size="sm">
                {open.address.street}, {open.address.postal_code} {open.address.city}
              </Text>
            )}
            <Divider />
            {open.items
              .filter((i) => i.parent_order_item_id === null)
              .map((i) => (
                <div key={i.id}>
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="sm">
                      {i.quantity} × {i.name}
                    </Text>
                    <Text size="sm">{euro(i.subtotal, 2)}</Text>
                  </Group>
                  {open.items
                    .filter((c) => c.parent_order_item_id === i.id)
                    .map((c) => (
                      <Text key={c.id} size="xs" c="dimmed" pl="md">
                        + {c.name}
                      </Text>
                    ))}
                  {i.comment && (
                    <Text size="xs" c="dimmed" fs="italic" pl="md">
                      « {i.comment} »
                    </Text>
                  )}
                </div>
              ))}
            <Divider />
            {open.delivery_fee > 0 && (
              <Group justify="space-between">
                <Text size="sm">Livraison</Text>
                <Text size="sm">{euro(open.delivery_fee, 2)}</Text>
              </Group>
            )}
            {open.discount_amount > 0 && (
              <Group justify="space-between">
                <Text size="sm">Réduction{open.promo_code ? ` (${open.promo_code})` : ''}</Text>
                <Text size="sm">− {euro(open.discount_amount, 2)}</Text>
              </Group>
            )}
            <Group justify="space-between">
              <Text fw={700}>Total</Text>
              <Text fw={700}>{euro(open.amount_total, 2)}</Text>
            </Group>
            {open.comment && (
              <Text size="sm" p="sm" style={{ background: 'var(--app-surface-2)', borderRadius: 8 }}>
                <b>Commentaire :</b> {open.comment}
              </Text>
            )}
          </Stack>
        )}
      </Drawer>
    </SectionCard>
  );
}
