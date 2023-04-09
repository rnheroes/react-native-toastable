import type { StatusMap } from '../types';

export const MAX_TOASTABLE_HEIGHT = 200;

export const TOASTABLE_PALETTE = {
  'green-500': '#00BFA6',
  'red-500': '#FF5252',
  'yellow-500': '#FFD600',
  'blue-500': '#2962FF',
  'white-500': '#FFFFFF',
};

export const TOASTABLE_STATUS_MAP: StatusMap = {
  success: TOASTABLE_PALETTE['green-500'],
  danger: TOASTABLE_PALETTE['red-500'],
  warning: TOASTABLE_PALETTE['yellow-500'],
  info: TOASTABLE_PALETTE['blue-500'],
};
