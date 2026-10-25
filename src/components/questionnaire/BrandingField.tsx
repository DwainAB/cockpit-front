import { ActionIcon, Box, Button, ColorInput, Group, Select, Stack, Text } from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';
import { useEffect } from 'react';
import { fontChoices } from '@/core';

const COLOR_LABELS = ['Couleur principale', 'Couleur secondaire', 'Couleur d’accent'];
const FONTS_LINK_ID = 'questionnaire-fonts';

/** Charge les polices proposées pour afficher leur aperçu. */
const useFontPreview = () =>
  useEffect(() => {
    if (document.getElementById(FONTS_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = FONTS_LINK_ID;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${fontChoices.map((f) => `family=${f.value.replace(/ /g, '+')}`).join('&')}&display=swap`;
    document.head.appendChild(link);
  }, []);

interface Props {
  value: { colors: string[]; font: string | null };
  onChange: (value: { colors: string[]; font: string | null }) => void;
  name: string;
}

export function BrandingField({ value, onChange, name }: Props) {
  useFontPreview();
  const setColor = (i: number, c: string) => onChange({ ...value, colors: value.colors.map((x, j) => (j === i ? c : x)) });

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={500} mb={6}>
          Couleurs (jusqu’à 3)
        </Text>
        <Stack gap="xs">
          {value.colors.map((c, i) => (
            <Group key={i} gap="xs" wrap="nowrap">
              <ColorInput
                style={{ flex: 1, maxWidth: 280 }}
                size="sm"
                format="hex"
                placeholder="#RRGGBB"
                aria-label={COLOR_LABELS[i]}
                description={COLOR_LABELS[i]}
                value={c}
                onChange={(v) => setColor(i, v)}
                swatches={['#2F5D50', '#8C3B2E', '#B3433B', '#1E2A3A', '#C9A227', '#4E7F3A', '#F2EDE4', '#111111']}
              />
              <ActionIcon variant="subtle" color="gray" mt={18} aria-label="Retirer la couleur" onClick={() => onChange({ ...value, colors: value.colors.filter((_, j) => j !== i) })}>
                <IconX size={16} />
              </ActionIcon>
            </Group>
          ))}
          {value.colors.length < 3 && (
            <Button size="xs" variant="light" w="fit-content" leftSection={<IconPlus size={14} />} onClick={() => onChange({ ...value, colors: [...value.colors, ''] })}>
              Ajouter une couleur
            </Button>
          )}
        </Stack>
      </div>
      <Select
        label="Police d’écriture"
        placeholder="Aucune préférence"
        clearable
        data={fontChoices}
        value={value.font}
        onChange={(font) => onChange({ ...value, font })}
        renderOption={({ option }) => <Text style={{ fontFamily: `'${option.value}', serif` }}>{option.label}</Text>}
        maw={420}
      />
      {(value.font || value.colors.some(Boolean)) && (
        <Box p="md" style={{ borderRadius: 10, border: '1px solid var(--app-border)', background: value.colors[1] || '#fff' }}>
          <Text size="xs" c="dimmed" mb={4}>
            Aperçu
          </Text>
          <Text fz={26} fw={600} style={{ fontFamily: value.font ? `'${value.font}', serif` : undefined, color: value.colors[0] || '#1f2130' }}>
            {name || 'Votre restaurant'}
          </Text>
          {value.colors[2] && <Box mt="xs" w={90} h={8} style={{ borderRadius: 4, background: value.colors[2] }} />}
        </Box>
      )}
    </Stack>
  );
}
