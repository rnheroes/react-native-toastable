export type AnimatableViewAnimation =
  | 'slideOutRight'
  | 'slideOutLeft'
  | 'slideOutUp'
  | 'slideOutDown'
  | 'slideInUp'
  | 'slideInDown';

export type AnimatableViewRef = {
  animate: (
    animation: AnimatableViewAnimation,
    duration: number
  ) => Promise<void>;
};

export type AnimationParams = {
  translateX?: number;
  translateY?: number;
};

export type AnimationConfig = {
  toValue: number;
  duration: number;
  useNativeDriver: boolean;
};
