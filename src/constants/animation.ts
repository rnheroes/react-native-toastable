import type {
  AnimationConfig,
  AnimatableViewAnimation,
  AnimationParams,
} from '../types';

export const ANIMATION_CONFIG: AnimationConfig = {
  toValue: 0,
  duration: 600,
  useNativeDriver: false,
};

export const ANIMATION_TRANSLATE: Record<
  AnimatableViewAnimation,
  'translateX' | 'translateY'
> = {
  slideOutRight: 'translateX',
  slideOutLeft: 'translateX',
  slideOutUp: 'translateY',
  slideOutDown: 'translateY',
  slideInUp: 'translateY',
  slideInDown: 'translateY',
};

export const ANIMATION_VALUE: {
  [key in AnimatableViewAnimation]: Required<AnimationParams>;
} = {
  slideOutRight: {
    translateX: 1000,
    translateY: 0,
  },
  slideOutLeft: {
    translateX: -1000,
    translateY: 0,
  },
  slideOutUp: {
    translateX: 0,
    translateY: -1000,
  },
  slideOutDown: {
    translateX: 0,
    translateY: -1000,
  },
  slideInUp: {
    translateX: 0,
    translateY: 0,
  },
  slideInDown: {
    translateX: 0,
    translateY: 0,
  },
};

export const TOASTER_DURATION = 1000 * 2;
export const TOASTER_ANIMATION_DURATION = 600;
