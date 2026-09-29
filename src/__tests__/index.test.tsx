import React from 'react';
import { StyleSheet } from 'react-native';
import { act, create } from 'react-test-renderer';
import type { ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';

import Toastable, { hideToastable, showToastable } from '../index';
import type { ToastableBodyParams } from '../index';

(global as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

jest.useFakeTimers();

// The react-native jest preset runs animation frames as 0 ms timeouts, so fake
// time never moves while an animation runs. 16 ms frames make springs and
// timings progress the way they do on a device.
const presetRequestAnimationFrame = global.requestAnimationFrame;
beforeAll(() => {
  global.requestAnimationFrame = ((callback: (time: number) => void) =>
    setTimeout(
      () => callback(Date.now()),
      16
    )) as unknown as typeof requestAnimationFrame;
});
afterAll(() => {
  global.requestAnimationFrame = presetRequestAnimationFrame;
});

let renderer: ReactTestRenderer | null = null;

afterEach(() => {
  act(() => renderer?.unmount());
  renderer = null;
  jest.clearAllTimers();
  jest.clearAllMocks();
});

const render = (element: React.ReactElement) => {
  act(() => {
    renderer = create(element);
  });
  return renderer!;
};

const advance = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

const show = (params: ToastableBodyParams) => act(() => showToastable(params));

const hide = () => act(() => hideToastable());

/** Host views are plain strings under the react-native jest preset. */
const isHost = (node: ReactTestInstance, name: string) =>
  (node.type as unknown) === name;

/** Texts on screen, in render order. */
const messages = () =>
  renderer!.root
    .findAll((node) => isHost(node, 'Text'))
    .map((node) => node.props.children);

/** The animated view of each toast on screen (it owns the pan handlers). */
const toastViews = () =>
  renderer!.root.findAll(
    (node) =>
      isHost(node, 'View') &&
      typeof node.props.onMoveShouldSetResponder === 'function'
  );

const toastView = () => {
  const [view] = toastViews();
  if (!view) throw new Error('no toast on screen');
  return view;
};

type Motion = { opacity: number; translateY: number; scale: number };

/** Current animated values of a toast, as rendered. */
const motionOf = (view: ReactTestInstance): Motion => {
  const style = StyleSheet.flatten(view.props.style) as {
    opacity: number;
    transform: Array<Record<string, number>>;
  };
  const pick = (key: string) =>
    style.transform.find((entry) => key in entry)?.[key] ?? NaN;
  return {
    opacity: style.opacity,
    translateY: pick('translateY'),
    scale: pick('scale'),
  };
};

/**
 * A finger on a toast. Drives the responder props the way React Native's
 * responder system does: touch events on the toast, then should-set,
 * grant, move and release on its PanResponder.
 */
const touch = (view: ReactTestInstance) => {
  let time = 1000;
  const track = {
    touchActive: true,
    startPageX: 100,
    startPageY: 100,
    startTimeStamp: time,
    currentPageX: 100,
    currentPageY: 100,
    currentTimeStamp: time,
    previousPageX: 100,
    previousPageY: 100,
    previousTimeStamp: time,
  };
  let granted = false;
  const event = () => ({
    nativeEvent: {
      touches: track.touchActive ? [{}] : [],
      changedTouches: [{}],
      timestamp: time,
    },
    touchHistory: {
      numberActiveTouches: track.touchActive ? 1 : 0,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: time,
      touchBank: [{ ...track }],
    },
  });
  const props = () => view.props;

  const finger = {
    down() {
      act(() => {
        props().onTouchStart?.(event());
        props().onStartShouldSetResponderCapture?.(event());
      });
      return finger;
    },
    /** Moves by `dy` (and `dx`) over one 16 ms frame. */
    move(dy: number, dx = 0) {
      act(() => {
        time += 16;
        track.previousPageX = track.currentPageX;
        track.previousPageY = track.currentPageY;
        track.previousTimeStamp = track.currentTimeStamp;
        track.currentPageX += dx;
        track.currentPageY += dy;
        track.currentTimeStamp = time;
        if (granted) {
          props().onResponderMove?.(event());
        } else {
          props().onMoveShouldSetResponderCapture?.(event());
          if (props().onMoveShouldSetResponder?.(event())) {
            granted = true;
            props().onResponderGrant?.(event());
          }
        }
        props().onTouchMove?.(event());
      });
      return finger;
    },
    up() {
      act(() => {
        time += 16;
        track.touchActive = false;
        if (granted) props().onResponderRelease?.(event());
        props().onTouchEnd?.(event());
      });
      return finger;
    },
  };
  return finger;
};

describe('queue', () => {
  it('shows one toast at a time, oldest first', () => {
    render(<Toastable duration={1000} />);
    show({ message: 'first' });
    show({ message: 'second' });
    show({ message: 'third' });

    expect(messages()).toEqual(['first']);
    advance(3000);
    expect(messages()).toEqual(['second']);
    advance(3000);
    expect(messages()).toEqual(['third']);
    advance(3000);
    expect(messages()).toEqual([]);
  });

  it('hideToastable() hides the toast on screen and moves on', () => {
    const onToastableHide = jest.fn();
    render(<Toastable duration={60000} onToastableHide={onToastableHide} />);
    show({ message: 'first' });
    show({ message: 'second' });
    advance(1000);

    hide();
    advance(1000);
    expect(messages()).toEqual(['second']);
    expect(onToastableHide).toHaveBeenCalledTimes(1);
  });

  it('hiding a toast during its entrance still lets the next one in', () => {
    render(<Toastable />);
    show({ message: 'first' });
    advance(50);
    hide();
    show({ message: 'second' });
    advance(1000);
    expect(messages()).toEqual(['second']);
  });

  it('alwaysVisible keeps the toast until it is hidden', () => {
    render(<Toastable alwaysVisible />);
    show({ message: 'sticky' });
    advance(30000);
    expect(messages()).toEqual(['sticky']);
    hide();
    advance(1000);
    expect(messages()).toEqual([]);
  });
});

describe('stack', () => {
  it('keeps at most maxStack toasts', () => {
    render(<Toastable displayMode="stack" maxStack={2} duration={60000} />);
    show({ message: 'one' });
    advance(1000);
    show({ message: 'two' });
    advance(1000);
    show({ message: 'three' });
    advance(1000);
    expect(messages()).toEqual(['two', 'three']);
  });
});

describe('swipe', () => {
  it('a drag up past the threshold dismisses the toast', () => {
    render(<Toastable duration={60000} />);
    show({ message: 'swipe me' });
    advance(1000);

    touch(toastView()).down().move(-6).move(-40).move(-40).up();
    advance(1000);
    expect(messages()).toEqual([]);
  });

  it('a short, slow drag springs back and the toast stays', () => {
    render(<Toastable duration={60000} />);
    show({ message: 'stay' });
    advance(1000);

    const finger = touch(toastView()).down().move(-6);
    for (let i = 0; i < 5; i++) finger.move(-2);
    finger.up();
    advance(1000);
    expect(messages()).toEqual(['stay']);
    expect(motionOf(toastView()).translateY).toBeCloseTo(0, 1);
  });

  it('only dismisses in the allowed directions', () => {
    render(<Toastable duration={60000} swipeDirection="left" />);
    show({ message: 'left only' });
    advance(1000);

    touch(toastView()).down().move(-6).move(-40).move(-40).up();
    advance(1000);
    expect(messages()).toEqual(['left only']);

    touch(toastView()).down().move(0, -6).move(0, -40).move(0, -40).up();
    advance(1000);
    expect(messages()).toEqual([]);
  });
});
