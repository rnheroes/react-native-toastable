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
import type { LayoutChangeEvent, PanResponderGestureState } from 'react-native';

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

    const [contentHeight, setContentHeight] = useState(0);
    // Resting Y for this toast — pure JS number, no Animated combinators.
    // For stackIndex 0 (newest / queue mode) this is always 0.
    const restY = stackSign * stackIndex * (contentHeight + stackGap);

    // Single Animated.Value per axis. Initial Y is off-screen so the entry
    // animation can spring up to restY.
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(offScreenY)).current;

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
        clearTimer();

        const outDuration = stateRef.current.animationOut;
        const onSettled = ({ finished }: { finished: boolean }) => {
          if (finished) finishHide();
        };

        if (direction === 'left' || direction === 'right') {
          const toX = direction === 'left' ? -SCREEN.width : SCREEN.width;
          Animated.timing(translateX, {
            toValue: toX,
            duration: outDuration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(onSettled);
        } else {
          const toY = direction === 'down' ? SCREEN.height : -SCREEN.height;
          Animated.timing(translateY, {
            toValue: toY,
            duration: outDuration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(onSettled);
        }
      },
      [clearTimer, finishHide, translateX, translateY]
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

    // Entry — animate from off-screen to restY. Run exactly once.
    useEffect(() => {
      const onSettled = ({ finished }: { finished: boolean }) => {
        if (!finished) return;
        if (stateRef.current.hasEntered) return;
        stateRef.current.hasEntered = true;
        scheduleAutoHide();
      };

      const target = stateRef.current.restY;

      if (itemAnimationType === 'spring') {
        Animated.spring(translateY, {
          ...TOASTABLE_SPRING_CONFIG,
          toValue: target,
        }).start(onSettled);
      } else {
        Animated.timing(translateY, {
          toValue: target,
          duration: itemAnimationIn,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(onSettled);
      }

      return clearTimer;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Stack re-flow: when this toast's resting position changes (a sibling
    // hid or the measured height settled), spring to the new restY. Skipped
    // during initial entry (entry handles that) and during close.
    useEffect(() => {
      if (!stateRef.current.hasEntered) return;
      if (stateRef.current.isClosing) return;
      Animated.spring(translateY, {
        ...TOASTABLE_SPRING_CONFIG,
        toValue: restY,
      }).start();
    }, [restY, translateY]);

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

    const onLayout = useCallback((e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      setContentHeight((prev) => (prev === h ? prev : h));
    }, []);

    return (
      <Animated.View
        onLayout={onLayout}
        // No pointerEvents="box-none" here — the toast itself needs to catch
        // swipe gestures. The host above uses box-none so taps off the toast
        // still reach the UI beneath. onMoveShouldSetPanResponder only takes
        // over on movement, so plain taps still propagate to the Pressable
        // inside ToastableBody / renderContent.
        style={[
          styles.item,
          positionStyle(itemPosition, itemOffset),
          {
            // One translateX, one translateY — no combinator nodes, no
            // duplicate transform keys. Both are plain native-driven
            // Animated.Values, which Fabric handles reliably.
            transform: [{ translateX }, { translateY }],
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
