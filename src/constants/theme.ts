import type { StatusMap } from '../types';

export const MAX_TOASTABLE_HEIGHT = 200;

export const PALETTE = {
  'green-500': '#00BFA6',
  'red-500': '#FF5252',
  'yellow-500': '#FFD600',
  'blue-500': '#2962FF',
  'white-500': '#FFFFFF',
};

export const STATUS_MAP: StatusMap = {
  success: PALETTE['green-500'],
  danger: PALETTE['red-500'],
  warning: PALETTE['yellow-500'],
  info: PALETTE['blue-500'],
};
