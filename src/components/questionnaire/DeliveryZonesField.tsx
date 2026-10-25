import { ActionIcon, Button, Group, NumberInput, Stack, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type { DeliveryZone } from '@/core';

interface Props {
  value: DeliveryZone[];
  onChange: (value: DeliveryZone[]) => void;
  maxKm: number;
  error?: string;
}

const MAX_ZONES = 10;
const num = (v: string | number, fallback = 0) => (v === '' ? fallback : Number(v));

/**
 * Zones de livraison, comme dans l'application : de X à Y km, des frais, et en option la gratuité à partir d'un montant.
 * Deux zones ne peuvent pas se toucher (0–3 km puis 4–6 km), règle actuelle de l'API (voir BACKLOG.md, point 3).
 */
export function DeliveryZonesField({ value, onChange, maxKm, error }: Props) {
  const set = (i: number, patch: Partial<DeliveryZone>) => onChange(value.map((z, j) => (j === i ? { ...z, ...patch } : z)));
  const add = () => {
    const last = value.at(-1);
    const fromKm = last ? last.toKm + 1 : 0;
    onChange([...value, { fromKm, toKm: Math.max(fromKm + 1, Math.min(fromKm + 3, maxKm)), fee: last ? last.fee + 1 : 2, freeFrom: null }]);
  };

  return (
    <Stack gap="xs">
      {value.map((zone, i) => (
        <Group key={i} gap="xs" align="flex-end" wrap="wrap" p="xs" style={{ border: '1px solid var(--app-border)', borderRadius: 8 }}>
          <NumberInput size="xs" w={80} label="De (km)" min={0} max={100} allowDecimal={false} value={zone.fromKm} onChange={(v) => set(i, { fromKm: num(v) })} />
          <NumberInput size="xs" w={80} label="À (km)" min={1} max={100} allowDecimal={false} value={zone.toKm} onChange={(v) => set(i, { toKm: num(v) })} />
          <NumberInput size="xs" w={110} label="Frais (€)" min={0} max={100} decimalScale={2} decimalSeparator="," value={zone.fee} onChange={(v) => set(i, { fee: num(v) })} />
          <NumberInput
            size="xs"
            w={150}
            label="Offerte dès (€)"
            placeholder="Jamais"
            min={1}
            max={10000}
            decimalScale={2}
            decimalSeparator=","
            value={zone.freeFrom ?? ''}
            onChange={(v) => set(i, { freeFrom: v === '' ? null : Number(v) })}
          />
          <ActionIcon variant="subtle" color="gray" mb={4} aria-label="Retirer cette zone" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      ))}
      {value.length < MAX_ZONES && (
        <Button size="compact-sm" variant="light" leftSection={<IconPlus size={14} />} onClick={add} style={{ alignSelf: 'flex-start' }}>
          Ajouter une zone
        </Button>
      )}
      <Text size="xs" c="dimmed">
        Exemple : de 0 à 3 km, 2 € (offerte dès 30 €), puis de 4 à 6 km, 4 €. Deux zones ne peuvent pas se toucher.
      </Text>
      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
    </Stack>
  );
}
