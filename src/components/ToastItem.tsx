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
  TOASTABLE_ENTER_DISTANCE,
  TOASTABLE_ENTER_REST,
  TOASTABLE_ENTER_SCALE,
  TOASTABLE_ENTER_SPRING,
  TOASTABLE_FADE_IN_DURATION,
  TOASTABLE_MIN_RESUME_DURATION,
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
  ToastableSpringConfig,
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
  springConfig: ToastableSpringConfig | undefined;
  /** Called once, when the toast starts to leave. */
  onClosing: () => void;
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
      springConfig,
      onClosing,
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
    // Spring settings merge: defaults, then Toastable props, then the payload.
    const itemSpringConfig = { ...springConfig, ...data.springConfig };

    // Stack direction: top stacks downward (+), bottom stacks upward (-). The
    // entrance comes from the same side: above for top and center, below for
    // bottom.
    const stackSign = itemPosition === 'bottom' ? -1 : 1;

    // Deck-of-cards layout: each older card peeks out by `stackGap` below the
    // newer one. No content-height math — that produced a vertical fan
    // instead of a stacked deck.
    const restY = stackSign * stackIndex * stackGap;
    const restScale = Math.max(MIN_SCALE, 1 - stackIndex * SCALE_STEP);

    // Single Animated.Value per axis. The toast starts a short distance
    // outside restY, a little smaller and transparent, so the entrance plays
    // on screen instead of spending its first part off screen.
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(
      new Animated.Value(restY - stackSign * TOASTABLE_ENTER_DISTANCE)
    ).current;
    const scale = useRef(
      new Animated.Value(restScale * TOASTABLE_ENTER_SCALE)
    ).current;
    // Opacity fades in on the entrance, and drops to 0 on close so the exit
    // animation reads even when newer toasts are layered above this one in
    // z-order.
    const opacity = useRef(new Animated.Value(0)).current;

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
      unmounted: false,
      // A finger is on the toast.
      held: false,
      // Auto-hide time left, and when the clock last started.
      remaining: itemDuration,
      clockStartedAt: 0,
      animationType: itemAnimationType,
      animationIn: itemAnimationIn,
      springConfig: itemSpringConfig,
      animationOut: itemAnimationOut,
      duration: itemDuration,
      alwaysVisible: itemAlwaysVisible,
      swipeDir: itemSwipeDir,
      sign: stackSign,
      restY,
      restScale,
      onToastableHide: data.onToastableHide,
      onClosing,
      onHide,
    });
    stateRef.current.animationType = itemAnimationType;
    stateRef.current.animationIn = itemAnimationIn;
    stateRef.current.springConfig = itemSpringConfig;
    stateRef.current.animationOut = itemAnimationOut;
    stateRef.current.duration = itemDuration;
    stateRef.current.alwaysVisible = itemAlwaysVisible;
    stateRef.current.swipeDir = itemSwipeDir;
    stateRef.current.sign = stackSign;
    stateRef.current.restY = restY;
    stateRef.current.restScale = restScale;
    stateRef.current.onToastableHide = data.onToastableHide;
    stateRef.current.onClosing = onClosing;
    stateRef.current.onHide = onHide;

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimer = useCallback(() => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }, []);

    const finishHide = useCallback(() => {
      if (stateRef.current.hideCalled || stateRef.current.unmounted) return;
      stateRef.current.hideCalled = true;
      stateRef.current.onToastableHide?.();
      stateRef.current.onHide();
    }, []);

    // Without a direction (timer, hideToastable(), maxStack, tap) the toast
    // leaves the way it came in; with one it follows the swipe off screen.
    const close = useCallback(
      (direction?: SwipeDirection) => {
        const state = stateRef.current;
        if (state.isClosing) return;
        state.isClosing = true;
        state.onClosing();
        setIsExiting(true);
        clearTimer();

        let exit: Animated.CompositeAnimation[];
        if (direction) {
          const out = {
            duration: state.animationOut,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          };
          exit = [
            direction === 'left' || direction === 'right'
              ? Animated.timing(translateX, {
                  ...out,
                  toValue: direction === 'left' ? -SCREEN.width : SCREEN.width,
                })
              : Animated.timing(translateY, {
                  ...out,
                  toValue:
                    direction === 'down' ? SCREEN.height : -SCREEN.height,
                }),
            Animated.timing(opacity, { ...out, toValue: 0 }),
          ];
        } else {
          // A short lift while fading and shrinking. Sliding a full window
          // height instead took the toast off screen within the first frame,
          // so the exit was never seen.
          const out = {
            duration: state.animationOut,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          };
          exit = [
            Animated.timing(translateY, {
              ...out,
              toValue: state.restY - state.sign * TOASTABLE_ENTER_DISTANCE,
            }),
            Animated.timing(scale, {
              ...out,
              toValue: state.restScale * TOASTABLE_ENTER_SCALE,
            }),
            Animated.timing(opacity, { ...out, toValue: 0 }),
          ];
        }

        // Closing is final. If anything stops the exit before it ends, the
        // toast is still removed; otherwise it would sit half faded and
        // every queued toast would wait behind it forever.
        Animated.parallel(exit).start(finishHide);
      },
      [clearTimer, finishHide, opacity, scale, translateX, translateY]
    );

    // The auto-hide clock runs only while the toast is settled on screen and
    // no finger is on it. `remaining` carries what is left across pauses.
    const startClock = useCallback(() => {
      const state = stateRef.current;
      if (state.alwaysVisible || state.isClosing) return;
      if (!state.hasEntered || state.held) return;
      clearTimer();
      state.clockStartedAt = Date.now();
      timerRef.current = setTimeout(() => close(), state.remaining);
    }, [clearTimer, close]);

    const markEntered = useCallback(() => {
      const state = stateRef.current;
      if (state.hasEntered) return;
      state.hasEntered = true;
      state.remaining = state.duration;
      startClock();
    }, [startClock]);

    const pauseClock = useCallback(() => {
      const state = stateRef.current;
      if (timerRef.current == null) return;
      const elapsed = Date.now() - state.clockStartedAt;
      state.remaining = Math.max(0, state.remaining - elapsed);
      clearTimer();
    }, [clearTimer]);

    // A finger on the toast (resting, tapping or dragging) stops the clock, so
    // the toast cannot leave from under the finger while it is being read.
    const hold = useCallback(() => {
      const state = stateRef.current;
      if (state.isClosing || state.held) return;
      state.held = true;
      pauseClock();
    }, [pauseClock]);

    // The finger let go without dismissing: the clock resumes where it was,
    // with at least a moment left to finish reading.
    const release = useCallback(() => {
      const state = stateRef.current;
      if (!state.held) return;
      state.held = false;
      state.remaining = Math.max(
        state.remaining,
        Math.min(state.duration, TOASTABLE_MIN_RESUME_DURATION)
      );
      startClock();
    }, [startClock]);

    useImperativeHandle(ref, () => ({ close: () => close() }), [close]);

    // The entrance: from a short distance outside restY, a little smaller and
    // transparent, the toast springs in (or eases in, with animationType
    // 'timing') while it fades in, so the whole motion happens on screen.
    // StrictMode and a hidden Activity detach the view, which stops running
    // animations, and then run the effect again: it goes on from where it is.
    useEffect(() => {
      const state = stateRef.current;
      if (state.isClosing || state.hasEntered) return undefined;

      let move: Animated.CompositeAnimation;
      let grow: Animated.CompositeAnimation;
      if (state.animationType === 'timing') {
        const config = {
          duration: state.animationIn,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        };
        move = Animated.timing(translateY, { ...config, toValue: state.restY });
        grow = Animated.timing(scale, { ...config, toValue: state.restScale });
      } else {
        const config = {
          ...TOASTABLE_ENTER_SPRING,
          ...state.springConfig,
          useNativeDriver: true,
        };
        move = Animated.spring(translateY, {
          ...config,
          ...TOASTABLE_ENTER_REST,
          toValue: state.restY,
        });
        grow = Animated.spring(scale, { ...config, toValue: state.restScale });
      }
      const fade = Animated.timing(opacity, {
        toValue: 1,
        duration:
          state.animationType === 'timing'
            ? Math.min(state.animationIn, TOASTABLE_FADE_IN_DURATION)
            : TOASTABLE_FADE_IN_DURATION,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      });
      // Started separately rather than in parallel: a finger that grabs the
      // toast mid-entrance stops the move, and the fade must still finish.
      fade.start();
      grow.start();
      move.start(({ finished }) => {
        if (finished) markEntered();
      });
      return () => {
        fade.stop();
        grow.stop();
        move.stop();
      };
    }, [opacity, scale, translateY, markEntered]);

    // translateY follows restY when the stack reflows. The first spring to
    // finish (the entrance, or a reflow that interrupted it) arms the
    // auto-hide timer.
    const lastRestYRef = useRef(restY);
    useEffect(() => {
      if (stateRef.current.isClosing || lastRestYRef.current === restY) return;
      lastRestYRef.current = restY;
      Animated.spring(translateY, {
        ...TOASTABLE_SPRING_CONFIG,
        toValue: restY,
      }).start(({ finished }) => {
        if (finished) markEntered();
      });
    }, [restY, translateY, markEntered]);

    // Scale driver: runs on restScale changes (stack promotions) after the
    // entrance. Skipped while closing so the fade-out isn't tugged sideways
    // by a stack reflow that fires the moment a sibling unmounts.
    const lastRestScaleRef = useRef(restScale);
    useEffect(() => {
      if (stateRef.current.isClosing) return;
      if (lastRestScaleRef.current === restScale) return;
      lastRestScaleRef.current = restScale;
      Animated.spring(scale, {
        ...TOASTABLE_SPRING_CONFIG,
        toValue: restScale,
      }).start();
    }, [restScale, scale]);

    // Cleanup any pending timer on unmount. An exit animation stopped by the
    // unmount must not report a hide for a toast that is already gone.
    // StrictMode and a hidden Activity run this cleanup and then the effect
    // again on the same toast: the clock goes on with the time it had left,
    // and a toast whose exit the detach stopped is removed.
    useEffect(() => {
      const state = stateRef.current;
      state.unmounted = false;
      if (state.isClosing) finishHide();
      else startClock();
      return () => {
        state.unmounted = true;
        pauseClock();
      };
    }, [finishHide, pauseClock, startClock]);

    const panResponder = useMemo(() => {
      // Back to rest after a drag that did not dismiss. The finger may have
      // interrupted the entrance, so settling here also counts as entered.
      const settle = () => {
        Animated.parallel(
          [
            Animated.spring(translateX, {
              ...TOASTABLE_SPRING_CONFIG,
              toValue: 0,
            }),
            Animated.spring(translateY, {
              ...TOASTABLE_SPRING_CONFIG,
              toValue: stateRef.current.restY,
            }),
          ],
          { stopTogether: false }
        ).start(markEntered);
        release();
      };
      return PanResponder.create({
        // A toast that is already leaving ignores the finger: moving it
        // would stop the exit animation halfway.
        onMoveShouldSetPanResponder: (_evt, g) =>
          !stateRef.current.isClosing &&
          (Math.abs(g.dx) >= TOASTABLE_PAN_RESPONDER_THRESHOLD ||
            Math.abs(g.dy) >= TOASTABLE_PAN_RESPONDER_THRESHOLD),
        onPanResponderGrant: hold,
        onPanResponderMove: (_evt, g) => {
          if (stateRef.current.isClosing) return;
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
          if (stateRef.current.isClosing) return;
          const dir = detectDirection(g.dx, g.dy);
          const distance =
            dir === 'left' || dir === 'right' ? Math.abs(g.dx) : Math.abs(g.dy);
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
          settle();
        },
        onPanResponderTerminate: () => {
          if (stateRef.current.isClosing) return;
          settle();
        },
      });
    }, [close, hold, markEntered, release, translateX, translateY]);

    const onPress = useCallback(() => {
      if (stateRef.current.alwaysVisible) close();
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
        onTouchStart={hold}
        onTouchEnd={release}
        onTouchCancel={release}
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
