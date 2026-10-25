import { ThemeIcon, Tooltip } from '@mantine/core';
import { IconBrandFacebook, IconBrandInstagram, IconBrandLinkedin, IconBrandTiktok } from '@tabler/icons-react';
import { type Network, networkColor, networkLabel } from '@/core';

const icons = { instagram: IconBrandInstagram, linkedin: IconBrandLinkedin, facebook: IconBrandFacebook, tiktok: IconBrandTiktok };

export function NetworkIcon({ network, size = 22 }: { network: Network; size?: number }) {
  const Icon = icons[network];
  return (
    <Tooltip label={networkLabel[network]}>
      <ThemeIcon size={size} radius="sm" variant="light" style={{ background: `${networkColor[network]}14`, color: networkColor[network] }}>
        <Icon size={Math.round(size * 0.68)} />
      </ThemeIcon>
    </Tooltip>
  );
}
