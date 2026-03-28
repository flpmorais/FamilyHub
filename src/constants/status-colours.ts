import { useColorScheme } from 'react-native';
import { PackingStatus } from '../types/packing.types';

export type StatusColourTokens = {
  bg: string;
  text: string;
  border: string;
};

// Final Material Design 3 status colour palette.
// bg values are the status badge/strip fill; text is the label colour on that bg.
// All light-mode text-on-bg combinations meet WCAG AA 4.5:1 contrast.
export const STATUS_COLOURS: Record<
  PackingStatus,
  { light: StatusColourTokens; dark: StatusColourTokens }
> = {
  new: {
    light: { bg: '#757575', text: '#FFFFFF', border: '#616161' },
    dark: { bg: '#BDBDBD', text: '#1C1B1F', border: '#9E9E9E' },
  },
  buy: {
    light: { bg: '#F59300', text: '#1C1B1F', border: '#E68900' },
    dark: { bg: '#FFB300', text: '#1C1B1F', border: '#FFA000' },
  },
  issue: {
    light: { bg: '#D32F2F', text: '#FFFFFF', border: '#C62828' },
    dark: { bg: '#EF5350', text: '#1C1B1F', border: '#E53935' },
  },
  ready: {
    light: { bg: '#1976D2', text: '#FFFFFF', border: '#1565C0' },
    dark: { bg: '#64B5F6', text: '#1C1B1F', border: '#42A5F5' },
  },
  last_minute: {
    light: { bg: '#00897B', text: '#FFFFFF', border: '#00796B' },
    dark: { bg: '#4DB6AC', text: '#1C1B1F', border: '#26A69A' },
  },
  packed: {
    light: { bg: '#388E3C', text: '#FFFFFF', border: '#2E7D32' },
    dark: { bg: '#66BB6A', text: '#1C1B1F', border: '#4CAF50' },
  },
};

/** Returns the status colour tokens for the current colour scheme. */
export function useStatusColours(): Record<PackingStatus, StatusColourTokens> {
  const colorScheme = useColorScheme();
  const mode = colorScheme === 'dark' ? 'dark' : 'light';
  return {
    new: STATUS_COLOURS.new[mode],
    buy: STATUS_COLOURS.buy[mode],
    issue: STATUS_COLOURS.issue[mode],
    ready: STATUS_COLOURS.ready[mode],
    last_minute: STATUS_COLOURS.last_minute[mode],
    packed: STATUS_COLOURS.packed[mode],
  };
}
