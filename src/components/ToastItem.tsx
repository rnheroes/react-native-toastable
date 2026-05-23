import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  StyleSheet,
} from 'react-native';
import type { PanResponderGestureState } from 'react-native';

import {
  TOASTABLE_PAN_RESPONDER_THRESHOLD,
  TOASTABLE_SPRING_CONFIG,
  TOASTABLE_SWIPE_THRESHOLD,
} from '../constants';
import type {
  StatusMap,
  SwipeDirection,
  ToastableAnimationType,
  ToastableBodyParams,
  ToastablePosition,
} from '../types';
import { ToastableBody } from './ToastableBody';

const SCREEN = Dimensions.get('window');

// 5% smaller per stack level. Subtle depth so the deck reads as 3D.
const SCALE_STEP = 0.05;
const MIN_SCALE = 0.85;

export type ToastItemHandle = {
  close: () => void;
};

export type ToastItemProps = {
  data: ToastableBodyParams;
  stackIndex: number;
  stackGap: number;
  position: ToastablePosition;
  offset: number;
  animationType: ToastableAnimationType;
  animationInTiming: number;
  animationOutTiming: number;
  duration: number;
  alwaysVisible: boolean;
  swipeDirection: SwipeDirection | SwipeDirection[];
  statusMap: StatusMap;
  titleColor: NonNullable<ToastableBodyParams['titleColor']>;
  messageColor: NonNullable<ToastableBodyParams['messageColor']>;
  titleStyle: ToastableBodyParams['titleStyle'];
  messageStyle: ToastableBodyParams['messageStyle'];
  onHide: () => void;
};

const detectDirection = (dx: number, dy: number): SwipeDirection => {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
};

const isDirectionAllowed = (
  dx: number,
  dy: number,
  direction: SwipeDirection,
  allowed: SwipeDirection | SwipeDirection[]
) => {
  const list = Array.isArray(allowed) ? allowed : [allowed];
  if (!list.includes(direction)) return false;
  if (direction === 'up') return dy < 0;
  if (direction === 'down') return dy > 0;
  if (direction === 'left') return dx < 0;
  if (direction === 'right') return dx > 0;
  return false;
};

export const ToastItem = forwardRef<ToastItemHandle, ToastItemProps>(
  (
    {
      data,
      stackIndex,
      stackGap,
      position,
      offset,
      animationType,
      animationInTiming,
      animationOutTiming,
      duration,
      alwaysVisible,
      swipeDirection,
      statusMap,
      titleColor,
      messageColor,
      titleStyle,
      messageStyle,
      onHide,
    },
    ref
  ) => {
    // Payload values win over Toastable-level defaults.
    const itemAnimationType = data.animationType ?? animationType;
    const itemAnimationIn = data.animationInTiming ?? animationInTiming;
    const itemAnimationOut = data.animationOutTiming ?? animationOutTiming;
    const itemDuration = data.duration ?? duration;
    const itemAlwaysVisible = data.alwaysVisible ?? alwaysVisible;
    const itemSwipeDir = data.swipeDirection ?? swipeDirection;
    const itemPosition = data.position ?? position;
    const itemOffset = data.offset ?? offset;
    const itemTitleColor = data.titleColor ?? titleColor;
    const itemMessageColor = data.messageColor ?? messageColor;
    const itemTitleStyle = data.titleStyle ?? titleStyle;
    const itemMessageStyle = data.messageStyle ?? messageStyle;

    // Stack direction: top stacks downward (+), bottom stacks upward (-).
    const stackSign = itemPosition === 'bottom' ? -1 : 1;
    // Off-screen entry/exit edge.
    const offScreenY = stackSign === 1 ? -SCREEN.height : SCREEN.height;

    // Deck-of-cards layout: each older card peeks out by `stackGap` below the
    // newer one. No content-height math — that produced a vertical fan
    // instead of a stacked deck.
    const restY = stackSign * stackIndex * stackGap;
    const restScale = Math.max(MIN_SCALE, 1 - stackIndex * SCALE_STEP);

    // Single Animated.Value per axis. Initial Y is off-screen so the entry
    // animation can spring up to restY.
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(offScreenY)).current;
    const scale = useRef(new Animated.Value(1)).current;
    // Opacity drops to 0 on close so the exit animation reads even when
    // newer toasts are layered above this one in z-order.
    const opacity = useRef(new Animated.Value(1)).current;

    // Tracked as state (not just a ref) so the View re-renders with the
    // higher zIndex when the toast starts closing — that brings the
    // closing card to the front of the deck so its slide-up + fade is
    // visible instead of being obscured by newer cards above it.
    const [isExiting, setIsExiting] = useState(false);

    // Refs for values used by stable callbacks (PanResponder, close, etc.).
    const stateRef = useRef({
      isClosing: false,
      hideCalled: false,
      hasEntered: false,
      animationOut: itemAnimationOut,
      duration: itemDuration,
      alwaysVisible: itemAlwaysVisible,
      swipeDir: itemSwipeDir,
      restY,
      onToastableHide: data.onToastableHide,
      onHide,
    });
    stateRef.current.animationOut = itemAnimationOut;
    stateRef.current.duration = itemDuration;
    stateRef.current.alwaysVisible = itemAlwaysVisible;
    stateRef.current.swipeDir = itemSwipeDir;
    stateRef.current.restY = restY;
    stateRef.current.onToastableHide = data.onToastableHide;
    stateRef.current.onHide = onHide;

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimer = useCallback(() => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }, []);

    const finishHide = useCallback(() => {
      if (stateRef.current.hideCalled) return;
      stateRef.current.hideCalled = true;
      stateRef.current.onToastableHide?.();
      stateRef.current.onHide();
    }, []);

    const close = useCallback(
      (direction: SwipeDirection = 'up') => {
        if (stateRef.current.isClosing) return;
        stateRef.current.isClosing = true;
        setIsExiting(true);
        clearTimer();

        const outDuration = stateRef.current.animationOut;
        const onSettled = ({ finished }: { finished: boolean }) => {
          if (finished) finishHide();
        };

        const axisAnimation =
          direction === 'left' || direction === 'right'
            ? Animated.timing(translateX, {
                toValue: direction === 'left' ? -SCREEN.width : SCREEN.width,
                duration: outDuration,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              })
            : Animated.timing(translateY, {
                toValue: direction === 'down' ? SCREEN.height : -SCREEN.height,
                duration: outDuration,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              });

        const fade = Animated.timing(opacity, {
          toValue: 0,
          duration: outDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });

        Animated.parallel([axisAnimation, fade]).start(onSettled);
      },
      [clearTimer, finishHide, opacity, translateX, translateY]
    );

    const scheduleAutoHide = useCallback(() => {
      if (stateRef.current.alwaysVisible) return;
      clearTimer();
      timerRef.current = setTimeout(
        () => close('up'),
        stateRef.current.duration
      );
    }, [clearTimer, close]);

    useImperativeHandle(ref, () => ({ close: () => close('up') }), [close]);

    // translateY driver: entry on first run (respecting animationType),
    // spring on subsequent restY changes (stack reflow). Whichever settle
    // finishes last arms the auto-hide timer.
    const isFirstRunRef = useRef(true);
    useEffect(() => {
      if (stateRef.current.isClosing) return;

      const onSettled = ({ finished }: { finished: boolean }) => {
        if (!finished) return;
        if (stateRef.current.hasEntered) return;
        stateRef.current.hasEntered = true;
        scheduleAutoHide();
      };

      const isFirstRun = isFirstRunRef.current;
      isFirstRunRef.current = false;

      if (isFirstRun && itemAnimationType === 'timing') {
        Animated.timing(translateY, {
          toValue: restY,
          duration: itemAnimationIn,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(onSettled);
      } else {
        Animated.spring(translateY, {
          ...TOASTABLE_SPRING_CONFIG,
          toValue: restY,
        }).start(onSettled);
      }
    }, [
      restY,
      translateY,
      scheduleAutoHide,
      itemAnimationType,
      itemAnimationIn,
    ]);

    // Scale driver: only runs on restScale changes (i.e. stack promotions).
    // Skipped while closing so the fade-out isn't tugged sideways by a
    // stack reflow that fires the moment a sibling unmounts.
    useEffect(() => {
      if (stateRef.current.isClosing) return;
      Animated.spring(scale, {
        ...TOASTABLE_SPRING_CONFIG,
        toValue: restScale,
      }).start();
    }, [restScale, scale]);

    // Cleanup any pending timer on unmount.
    useEffect(() => clearTimer, [clearTimer]);

    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onMoveShouldSetPanResponder: (_evt, g) =>
            Math.abs(g.dx) >= TOASTABLE_PAN_RESPONDER_THRESHOLD ||
            Math.abs(g.dy) >= TOASTABLE_PAN_RESPONDER_THRESHOLD,
          onPanResponderGrant: clearTimer,
          onPanResponderMove: (_evt, g) => {
            const dir = detectDirection(g.dx, g.dy);
            const allowed = stateRef.current.swipeDir;
            if (!isDirectionAllowed(g.dx, g.dy, dir, allowed)) return;
            if (dir === 'left' || dir === 'right') {
              translateX.setValue(g.dx);
            } else {
              // Drag relative to current resting position.
              translateY.setValue(stateRef.current.restY + g.dy);
            }
          },
          onPanResponderRelease: (_evt, g: PanResponderGestureState) => {
            const dir = detectDirection(g.dx, g.dy);
            const distance =
              dir === 'left' || dir === 'right'
                ? Math.abs(g.dx)
                : Math.abs(g.dy);
            const allowed = isDirectionAllowed(
              g.dx,
              g.dy,
              dir,
              stateRef.current.swipeDir
            );

            if (allowed && distance > TOASTABLE_SWIPE_THRESHOLD) {
              close(dir);
              return;
            }

            Animated.parallel([
              Animated.spring(translateX, {
                ...TOASTABLE_SPRING_CONFIG,
                toValue: 0,
              }),
              Animated.spring(translateY, {
                ...TOASTABLE_SPRING_CONFIG,
                toValue: stateRef.current.restY,
              }),
            ]).start(({ finished }) => {
              if (finished) scheduleAutoHide();
            });
          },
          onPanResponderTerminate: () => {
            Animated.parallel([
              Animated.spring(translateX, {
                ...TOASTABLE_SPRING_CONFIG,
                toValue: 0,
              }),
              Animated.spring(translateY, {
                ...TOASTABLE_SPRING_CONFIG,
                toValue: stateRef.current.restY,
              }),
            ]).start(({ finished }) => {
              if (finished) scheduleAutoHide();
            });
          },
        }),
      [clearTimer, close, scheduleAutoHide, translateX, translateY]
    );

    const onPress = useCallback(() => {
      if (stateRef.current.alwaysVisible) close('up');
      data.onPress?.();
    }, [close, data]);

    return (
      <Animated.View
        style={[
          styles.item,
          positionStyle(itemPosition, itemOffset),
          isExiting ? styles.exiting : null,
          {
            opacity,
            transform: [{ translateX }, { translateY }, { scale }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <ToastableBody
          message={data.message}
          title={data.title}
          status={data.status}
          backgroundColor={data.backgroundColor}
          contentStyle={data.contentStyle}
          statusMap={statusMap}
          renderContent={data.renderContent}
          onPress={onPress}
          titleColor={itemTitleColor}
          titleStyle={itemTitleStyle}
          messageColor={itemMessageColor}
          messageStyle={itemMessageStyle}
        />
      </Animated.View>
    );
  }
);

ToastItem.displayName = 'ToastItem';

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginHorizontal: 16,
  },
  exiting: {
    // Lifts the closing toast above its siblings so the slide-up + fade
    // exit isn't obscured by newer cards stacked on top in z-order.
    zIndex: 1000,
    elevation: 1000,
  },
});

const positionStyle = (pos: ToastablePosition, value: number) => {
  switch (pos) {
    case 'bottom':
      return { bottom: value };
    case 'center':
      return { top: SCREEN.height / 2 };
    case 'top':
    default:
      return { top: value };
  }
};
