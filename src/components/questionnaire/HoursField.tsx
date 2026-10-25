import { ActionIcon, Checkbox, Group, Stack, Switch, Text, Tooltip } from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { IconCopy } from '@tabler/icons-react';
import { dayKeys, dayLabels, type DayHours, type DayKey, type OpeningHours, type TimeSlot } from '@/core';

interface Props {
  value: OpeningHours;
  onChange: (value: OpeningHours) => void;
  error?: string;
}

type Service = 'lunch' | 'dinner';

const DEFAULTS: Record<Service, TimeSlot> = { lunch: { open: '12:00', close: '14:30' }, dinner: { open: '19:00', close: '22:30' } };
const SERVICE_LABELS: Record<Service, string> = { lunch: 'Midi', dinner: 'Soir' };

/** Horaires jour par jour : un service le midi et/ou le soir, comme dans l'application Yumco. */
export function HoursField({ value, onChange, error }: Props) {
  const setDay = (day: DayKey, next: DayHours) => onChange({ ...value, [day]: next });
  const copyToAll = (day: DayKey) => {
    const d = value[day];
    onChange(Object.fromEntries(dayKeys.map((k) => [k, { closed: d.closed, lunch: d.lunch && { ...d.lunch }, dinner: d.dinner && { ...d.dinner } }])) as OpeningHours);
  };

  const serviceField = (day: DayKey, service: Service) => {
    const d = value[day];
    const slot = d[service];
    const set = (patch: Partial<TimeSlot>) => setDay(day, { ...d, [service]: { ...slot!, ...patch } });
    return (
      <Group gap={6} wrap="nowrap">
        <Checkbox
          size="xs"
          w={58}
          label={SERVICE_LABELS[service]}
          checked={slot !== null}
          onChange={(e) => setDay(day, { ...d, [service]: e.currentTarget.checked ? { ...DEFAULTS[service] } : null })}
        />
        {slot && (
          <>
            <TimeInput size="xs" aria-label={`${dayLabels[day]}, ${SERVICE_LABELS[service].toLowerCase()} : ouverture`} value={slot.open} onChange={(e) => set({ open: e.currentTarget.value })} />
            <Text size="xs" c="dimmed">
              à
            </Text>
            <TimeInput size="xs" aria-label={`${dayLabels[day]}, ${SERVICE_LABELS[service].toLowerCase()} : fermeture`} value={slot.close} onChange={(e) => set({ close: e.currentTarget.value })} />
          </>
        )}
      </Group>
    );
  };

  return (
    <Stack gap={6}>
      {dayKeys.map((day) => {
        const d = value[day];
        return (
          <Group key={day} gap="sm" wrap="wrap" align="center" py={6} style={{ borderBottom: '1px solid var(--app-border)' }}>
            <Text size="sm" fw={600} w={90}>
              {dayLabels[day]}
            </Text>
            <Switch
              size="sm"
              w={100}
              checked={!d.closed}
              label={d.closed ? 'Fermé' : 'Ouvert'}
              onChange={(e) => {
                const open = e.currentTarget.checked;
                setDay(day, open && !d.lunch && !d.dinner ? { closed: false, lunch: { ...DEFAULTS.lunch }, dinner: { ...DEFAULTS.dinner } } : { ...d, closed: !open });
              }}
            />
            {!d.closed && (
              <Group gap="md" wrap="wrap" style={{ flex: 1 }}>
                {serviceField(day, 'lunch')}
                {serviceField(day, 'dinner')}
              </Group>
            )}
            <Tooltip label="Appliquer ces horaires à toute la semaine">
              <ActionIcon size="sm" variant="subtle" color="gray" ml="auto" aria-label={`Copier les horaires du ${dayLabels[day]} sur tous les jours`} onClick={() => copyToAll(day)}>
                <IconCopy size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        );
      })}
      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
    </Stack>
  );
}
