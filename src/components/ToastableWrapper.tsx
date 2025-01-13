import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  InteractionManager,
  PanResponder,
  PanResponderGestureState,
  PanResponderInstance,
  StyleSheet,
  View,
  ViewProps,
} from 'react-native';

import { AnimatableView } from './AnimatableView';
import type {
  AnimatableViewAnimation,
  AnimatableViewRef,
  SwipeDirection,
} from '../types';
import { useConstructor } from '../hooks';

const defaultProps: ToastableWrapperProps = {
  animationInTiming: 600,
  animationOutTiming: 600,
  useNativeDriver: false,
  isVisible: false,
  panResponderThreshold: 4,
  swipeThreshold: 100,
  onToasterHide: () => null,
  onToasterWillHide: () => null,
  swipeDirection: ['right', 'left', 'up'],
  onSwipeComplete: () => null,
  onSwipeStart: () => null,
};

type ToastableWrapperProps = {
  animationInTiming: number;
  animationOutTiming: number;
  useNativeDriver: boolean;
  isVisible: boolean;
  panResponderThreshold: number;
  swipeThreshold: number;
  onToasterHide: () => void;
  onToasterWillHide?: () => void;
  onSwipeStart?: (gestureState: PanResponderGestureState) => void;
  onSwipeComplete: (
    gestureData: { swipingDirection: SwipeDirection },
    gestureState: PanResponderGestureState
  ) => void;
  swipeDirection: SwipeDirection | SwipeDirection[];
  style?: ViewProps['style'];
};

let isTransitioning = false;
let currentSwipingDirection: SwipeDirection = 'up';
let panResponder: PanResponderInstance | null = null;
let interactionHandle: number | null = null;

const buildPanResponder = ({
  onSwipeStart,
  onSwipeComplete,
  panResponderThreshold,
  swipeThreshold,
  pan,
  swipeDirection,
}: Pick<
  ToastableWrapperProps,
  | 'onSwipeStart'
  | 'onSwipeComplete'
  | 'panResponderThreshold'
  | 'swipeThreshold'
  | 'swipeDirection'
> & {
  pan: Animated.ValueXY;
}) => {
  let animatedEvent = (
    _evt: GestureResponderEvent,
    _gestureState: PanResponderGestureState
  ) => {};
  panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_evt, gestureState) => {
      const { dx, dy } = gestureState;
      const shouldSetPanResponder =
        Math.abs(dx) >= panResponderThreshold ||
        Math.abs(dy) >= panResponderThreshold;

      if (shouldSetPanResponder) {
        onSwipeStart?.(gestureState);
      }

      currentSwipingDirection = getSwipingDirection({ dx, dy });

      animatedEvent = createAnimationEventForSwipe(pan);

      return shouldSetPanResponder;
    },
    onPanResponderMove: (evt, gestureState) => {
      const { dx, dy } = gestureState;

      if (dx === 0 && dy === 0) {
        return;
      }

      currentSwipingDirection = getSwipingDirection({ dx, dy });

      animatedEvent = createAnimationEventForSwipe(pan);

      const isDirectionAllowed = isSwipeDirectionAllowed({
        dx,
        dy,
        swipeDirection,
      });

      if (isDirectionAllowed) {
        animatedEvent(evt, gestureState);
      }
    },
    onPanResponderRelease: (_evt, gestureState) => {
      const { dx, dy } = gestureState;
      const accDistance = getAccDistancePerDirection({ dx, dy });
      const isSwipeThresholdReached = accDistance > swipeThreshold;
      const isDirectionAllowed = isSwipeDirectionAllowed({
        dx,
        dy,
        swipeDirection,
      });

      if (isSwipeThresholdReached && isDirectionAllowed) {
        onSwipeComplete(
          { swipingDirection: getSwipingDirection({ dx, dy }) },
          gestureState
        );
        return;
      }
    },
  });
};

const getAccDistancePerDirection = ({
  dx,
  dy,
}: Pick<PanResponderGestureState, 'dx' | 'dy'>) => {
  switch (currentSwipingDirection) {
    case 'up':
      return -dy;
    case 'down':
      return dy;
    case 'right':
      return dx;
    case 'left':
      return -dx;
    default:
      return 0;
  }
};

const getSwipingDirection = ({
  dx,
  dy,
}: Pick<PanResponderGestureState, 'dx' | 'dy'>) => {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
};

const createAnimationEventForSwipe = (pan: Animated.ValueXY) => {
  if (
    currentSwipingDirection === 'right' ||
    currentSwipingDirection === 'left'
  ) {
    return Animated.event([null, { dx: pan.x }], {
      useNativeDriver: false,
    });
  }
  return Animated.event([null, { dy: pan.y }], {
    useNativeDriver: false,
  });
};

const isDirectionIncluded = (
  direction: SwipeDirection,
  swipeDirection: SwipeDirection | SwipeDirection[]
) => {
  return Array.isArray(swipeDirection)
    ? swipeDirection.includes(direction)
    : swipeDirection === direction;
};

const isSwipeDirectionAllowed = ({
  dy,
  dx,
  swipeDirection,
}: Pick<PanResponderGestureState, 'dx' | 'dy'> &
  Pick<ToastableWrapperProps, 'swipeDirection'>) => {
  const draggedDown = dy > 0;
  const draggedUp = dy < 0;
  const draggedLeft = dx < 0;
  const draggedRight = dx > 0;
  if (
    currentSwipingDirection === 'up' &&
    isDirectionIncluded('up', swipeDirection) &&
    draggedUp
  ) {
    return true;
  }
  if (
    currentSwipingDirection === 'down' &&
    isDirectionIncluded('down', swipeDirection) &&
    draggedDown
  ) {
    return true;
  }
  if (
    currentSwipingDirection === 'right' &&
    isDirectionIncluded('right', swipeDirection) &&
    draggedRight
  ) {
    return true;
  }
  if (
    currentSwipingDirection === 'left' &&
    isDirectionIncluded('left', swipeDirection) &&
    draggedLeft
  ) {
    return true;
  }
  return false;
};

const ANIMATION_MAP: Record<SwipeDirection, AnimatableViewAnimation> = {
  up: 'slideOutUp',
  down: 'slideOutDown',
  left: 'slideOutLeft',
  right: 'slideOutRight',
};

export const ToastableWrapper = ({
  ...props
}: PropsWithChildren<ToastableWrapperProps>) => {
  const isSwipeable = !!props.swipeDirection;

  const [isVisible, setIsVisible] = useState(props.isVisible);
  const pan = useRef(new Animated.ValueXY()).current;
  const contentRef = useRef<AnimatableViewRef>(null);

  const open = () => {
    if (isTransitioning) {
      return;
    }

    isTransitioning = true;

    if (isSwipeable) {
      pan.setValue({ x: 0, y: 0 });
    }

    const { current: content } = contentRef;

    if (!content) {
      return;
    }

    if (interactionHandle == null) {
      interactionHandle = InteractionManager.createInteractionHandle();
    }
    content.animate('slideInDown', props.animationInTiming).then(() => {
      isTransitioning = false;

      if (interactionHandle) {
        InteractionManager.clearInteractionHandle(interactionHandle);
        interactionHandle = null;
      }

      if (!props.isVisible) {
        close();
      }
    });
  };

  const close = () => {
    if (isTransitioning) {
      return;
    }

    isTransitioning = true;

    const { current: content } = contentRef;

    if (!content) {
      return;
    }

    props.onToasterWillHide?.();

    if (interactionHandle == null) {
      interactionHandle = InteractionManager.createInteractionHandle();
    }

    content
      .animate(ANIMATION_MAP[currentSwipingDirection], props.animationOutTiming)
      .then(() => {
        isTransitioning = false;

        if (interactionHandle) {
          InteractionManager.clearInteractionHandle(interactionHandle);
          interactionHandle = null;
        }

        if (!props.isVisible) {
          setIsVisible(false);
          props.onToasterHide();
          return;
        }

        open();
      });
  };

  useConstructor(() => {
    buildPanResponder({
      onSwipeComplete: props.onSwipeComplete,
      onSwipeStart: props.onSwipeStart,
      pan,
      panResponderThreshold: props.panResponderThreshold,
      swipeDirection: props.swipeDirection,
      swipeThreshold: props.swipeThreshold,
    });
  });

  useEffect(() => {
    if (isVisible) {
      open();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (interactionHandle) {
        InteractionManager.clearInteractionHandle(interactionHandle);
        interactionHandle = null;
      }
    };
  }, []);

  const prevIsVisibleRef = useRef(false);

  useEffect(() => {
    const wasVisible = prevIsVisibleRef.current;

    if (props.isVisible !== wasVisible) {
      props.isVisible ? open() : close();
      prevIsVisibleRef.current = props.isVisible;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isVisible]);

  // FIXME: this should be placed in the render method, but it causes a bug
  // if (!isVisible) {
  //     return null;
  // }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <AnimatableView
        ref={contentRef}
        style={[pan.getLayout(), styles.content, props.style]}
        pointerEvents="box-none"
        {...panResponder?.panHandlers}
      >
        {props.children}
      </AnimatableView>
    </View>
  );
};

ToastableWrapper.defaultProps = defaultProps;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  content: {
    flex: 1,
  },
});
