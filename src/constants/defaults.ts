import type { SwipeDirection } from '../types';

export const TOASTABLE_DURATION = 2000;
export const TOASTABLE_ANIMATION_DURATION = 300;
export const TOASTABLE_OFFSET = 56;
export const TOASTABLE_SWIPE_THRESHOLD = 60;
export const TOASTABLE_PAN_RESPONDER_THRESHOLD = 4;
export const TOASTABLE_STACK_GAP = 8;
export const TOASTABLE_MAX_STACK = 3;

export const TOASTABLE_DEFAULT_SWIPE_DIRECTIONS: SwipeDirection[] = [
  'up',
  'left',
  'right',
];

export const TOASTABLE_SPRING_CONFIG = {
  tension: 90,
  friction: 14,
  useNativeDriver: true,
};
