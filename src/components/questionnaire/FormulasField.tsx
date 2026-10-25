import { ActionIcon, Button, Group, NumberInput, Stack, Text, TextInput } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

type Formula = { name: string; price: number };

interface Props {
  value: Formula[];
  onChange: (value: Formula[]) => void;
  error?: string;
}

const MAX_FORMULAS = 10;

/** Formules à volonté (nom et prix par personne), créées telles quelles dans l'application. */
export function FormulasField({ value, onChange, error }: Props) {
  const set = (i: number, patch: Partial<Formula>) => onChange(value.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <Stack gap="xs">
      {value.map((formula, i) => (
        <Group key={i} gap="xs" align="flex-end" wrap="nowrap">
          <TextInput size="xs" label="Formule" placeholder="Midi, Soir, Week-end…" maxLength={80} style={{ flex: 1 }} value={formula.name} onChange={(e) => set(i, { name: e.currentTarget.value })} />
          <NumberInput
            size="xs"
            w={130}
            label="Prix par personne (€)"
            min={0}
            max={1000}
            decimalScale={2}
            decimalSeparator=","
            value={formula.price || ''}
            onChange={(v) => set(i, { price: v === '' ? 0 : Number(v) })}
          />
          <ActionIcon variant="subtle" color="gray" mb={4} aria-label="Retirer cette formule" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      ))}
      {value.length < MAX_FORMULAS && (
        <Button size="compact-sm" variant="light" leftSection={<IconPlus size={14} />} onClick={() => onChange([...value, { name: '', price: 0 }])} style={{ alignSelf: 'flex-start' }}>
          Ajouter une formule
        </Button>
      )}
      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
    </Stack>
  );
}
