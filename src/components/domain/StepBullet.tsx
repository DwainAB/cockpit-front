import { ThemeIcon } from '@mantine/core';
import { IconCheck, IconClockHour4, IconEdit, IconLock, IconMinus, IconPoint, IconUserCheck } from '@tabler/icons-react';
import type { StepStatus } from '@/core';

const map: Record<StepStatus, { icon: typeof IconCheck; color: string; variant: 'filled' | 'light' }> = {
  done: { icon: IconCheck, color: 'sage', variant: 'filled' },
  in_progress: { icon: IconClockHour4, color: 'blue', variant: 'filled' },
  awaiting_validation: { icon: IconUserCheck, color: 'night', variant: 'filled' },
  changes_requested: { icon: IconEdit, color: 'orange', variant: 'filled' },
  blocked: { icon: IconLock, color: 'red', variant: 'filled' },
  todo: { icon: IconPoint, color: 'gray', variant: 'light' },
  skipped: { icon: IconMinus, color: 'gray', variant: 'light' },
};

export function StepBullet({ status, size = 24 }: { status: StepStatus; size?: number }) {
  const { icon: Icon, color, variant } = map[status];
  return (
    <ThemeIcon size={size} radius="xl" color={color} variant={variant}>
      <Icon size={Math.round(size * 0.58)} />
    </ThemeIcon>
  );
}
