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

    const offScreenY =
      itemPosition === 'bottom' ? SCREEN.height : -SCREEN.height;

    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(offScreenY)).current;
    const stackOffset = useRef(new Animated.Value(0)).current;

    const [contentHeight, setContentHeight] = useState(0);

    // All mutable per-render values flow through a single ref so the callbacks
    // below can stay stable and the PanResponder isn't rebuilt every render.
    const stateRef = useRef({
      isClosing: false,
      hideCalled: false,
      animationOut: itemAnimationOut,
      duration: itemDuration,
      alwaysVisible: itemAlwaysVisible,
      swipeDir: itemSwipeDir,
      onToastableHide: data.onToastableHide,
      onHide,
    });
    stateRef.current.animationOut = itemAnimationOut;
    stateRef.current.duration = itemDuration;
    stateRef.current.alwaysVisible = itemAlwaysVisible;
    stateRef.current.swipeDir = itemSwipeDir;
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

        let toX = 0;
        let toY = 0;
        if (direction === 'left') toX = -SCREEN.width;
        else if (direction === 'right') toX = SCREEN.width;
        else if (direction === 'down') toY = SCREEN.height;
        else toY = -SCREEN.height;

        Animated.parallel([
          Animated.timing(translateX, {
            toValue: toX,
            duration: stateRef.current.animationOut,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: toY,
            duration: stateRef.current.animationOut,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) finishHide();
        });
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

    // Entry — run exactly once on mount.
    useEffect(() => {
      const onSettled = ({ finished }: { finished: boolean }) => {
        if (finished) scheduleAutoHide();
      };

      if (itemAnimationType === 'spring') {
        Animated.spring(translateY, {
          ...TOASTABLE_SPRING_CONFIG,
          toValue: 0,
        }).start(onSettled);
      } else {
        Animated.timing(translateY, {
          toValue: 0,
          duration: itemAnimationIn,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(onSettled);
      }

      return clearTimer;
      // Entry runs once with the values present at mount time.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-flow when stack index changes (e.g. earlier toast hid).
    useEffect(() => {
      Animated.spring(stackOffset, {
        ...TOASTABLE_SPRING_CONFIG,
        toValue: stackIndex * (contentHeight + stackGap),
      }).start();
    }, [stackIndex, contentHeight, stackGap, stackOffset]);

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
              translateY.setValue(g.dy);
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
                toValue: 0,
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
                toValue: 0,
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

    // Top/center: stack downward. Bottom: stack upward.
    const composedTranslateY = useMemo(() => {
      const sign = itemPosition === 'bottom' ? -1 : 1;
      return Animated.add(
        translateY,
        Animated.multiply(stackOffset, new Animated.Value(sign))
      );
    }, [itemPosition, translateY, stackOffset]);

    return (
      <Animated.View
        onLayout={onLayout}
        pointerEvents="box-none"
        style={[
          styles.item,
          positionStyle(itemPosition, itemOffset),
          {
            transform: [{ translateX }, { translateY: composedTranslateY }],
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
