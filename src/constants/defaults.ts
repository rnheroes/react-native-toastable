import type { SwipeDirection } from '../types';

export const TOASTABLE_DURATION = 2000;
export const TOASTABLE_ANIMATION_DURATION = 300;
export const TOASTABLE_OFFSET = 56;
export const TOASTABLE_SWIPE_THRESHOLD = 60;
/** Flick speed that dismisses a toast however short the drag, in px/ms. */
export const TOASTABLE_SWIPE_VELOCITY = 0.5;
export const TOASTABLE_PAN_RESPONDER_THRESHOLD = 4;
export const TOASTABLE_STACK_GAP = 8;
export const TOASTABLE_MAX_STACK = 3;
/** Least time left on the clock after a finger lets go of a toast, in ms. */
export const TOASTABLE_MIN_RESUME_DURATION = 1000;

export const TOASTABLE_DEFAULT_SWIPE_DIRECTIONS: SwipeDirection[] = [
  'up',
  'left',
  'right',
];

/** Spring for stack reflow and the spring back after a drag. No overshoot. */
export const TOASTABLE_SPRING_CONFIG = {
  tension: 90,
  friction: 14,
  useNativeDriver: true,
};

/**
 * How far outside its resting place a toast starts its entrance, and how far
 * it travels on an exit that is not a swipe.
 */
export const TOASTABLE_ENTER_DISTANCE = 36;
/** Scale a toast grows from on its entrance and shrinks to on a plain exit. */
export const TOASTABLE_ENTER_SCALE = 0.95;
/** Fade-in length of the entrance, in ms. */
export const TOASTABLE_FADE_IN_DURATION = 160;

/**
 * Entrance spring. A damping ratio of about 0.53 takes the toast about 5 px
 * past its resting place before it settles.
 */
export const TOASTABLE_ENTER_SPRING = {
  stiffness: 200,
  damping: 15,
  mass: 1,
};

/**
 * The entrance counts as settled (which starts the auto-hide timer) once the
 * toast is within half a pixel of its place and nearly still, about 0.65 s
 * in, instead of waiting for sub-pixel motion to die out. In px and px/s, so
 * only for translateY.
 */
export const TOASTABLE_ENTER_REST = {
  restDisplacementThreshold: 0.5,
  restSpeedThreshold: 5,
};
