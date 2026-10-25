import { Badge, type BadgeProps } from '@mantine/core';
import type { StatusMeta, Tone } from '@/core';

const toneColor: Record<Tone, string> = {
  neutral: 'gray',
  info: 'blue',
  accent: 'night',
  warning: 'orange',
  success: 'sage',
  danger: 'red',
  muted: 'gray',
};

interface Props extends Omit<BadgeProps, 'color' | 'children'> {
  /** Entrée d'une table de statuts de `lib/labels`. */
  meta: StatusMeta;
  dot?: boolean;
}

/** Badge de statut unique pour toute l'application : même ton = même couleur partout. */
export function StatusBadge({ meta, dot = true, size = 'sm', ...rest }: Props) {
  return (
    <Badge
      variant={meta.tone === 'accent' ? 'filled' : 'light'}
      color={toneColor[meta.tone]}
      size={size}
      leftSection={dot && meta.tone !== 'accent' ? <span style={{ width: 6, height: 6, borderRadius: 6, background: 'currentColor', display: 'block' }} /> : undefined}
      styles={{ root: { textTransform: 'none', fontWeight: 600, opacity: meta.tone === 'muted' ? 0.75 : 1 } }}
      {...rest}
    >
      {meta.label}
    </Badge>
  );
}
