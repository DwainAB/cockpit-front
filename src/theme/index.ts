import { createTheme, type MantineColorsTuple } from '@mantine/core';

const night: MantineColorsTuple = ['#EEF0FA', '#DADFF3', '#B3BCE6', '#8A97D7', '#6876CA', '#5262C2', '#4353B5', '#3B4A9E', '#2F3B80', '#222B5E'];
const sage: MantineColorsTuple = ['#EEF6F1', '#DCEDE3', '#B7D9C5', '#90C4A6', '#71B28C', '#5E9C7D', '#4F8A6C', '#3F7258', '#305A45', '#203D2F'];

export const theme = createTheme({
  primaryColor: 'night',
  primaryShade: 7,
  colors: { night, sage },
  fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
  headings: { fontFamily: 'Inter, system-ui, sans-serif', fontWeight: '650' },
  defaultRadius: 'md',
  radius: { md: '10px', lg: '14px' },
  shadows: {
    xs: '0 1px 2px rgba(30, 32, 48, 0.04)',
    sm: '0 1px 3px rgba(30, 32, 48, 0.06), 0 1px 2px rgba(30, 32, 48, 0.04)',
    md: '0 6px 18px rgba(30, 32, 48, 0.08)',
  },
  components: {
    Card: { defaultProps: { withBorder: true, shadow: 'xs', radius: 'lg', padding: 'lg' } },
    Paper: { defaultProps: { radius: 'lg' } },
    Button: { defaultProps: { radius: 'md' } },
    Modal: { defaultProps: { radius: 'lg', centered: true, overlayProps: { backgroundOpacity: 0.35, blur: 2 } } },
    Badge: { defaultProps: { radius: 'sm' } },
    Tooltip: { defaultProps: { withArrow: true, openDelay: 250 } },
  },
});
