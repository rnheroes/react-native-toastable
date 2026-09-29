import React from 'react';
import { StyleSheet, View } from 'react-native';
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

const rerender = (element: React.ReactElement) =>
  act(() => renderer!.update(element));

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

/** Texts on screen inside the view with `testID`. */
const messagesIn = (testID: string) =>
  renderer!.root
    .findAll((node) => isHost(node, 'View') && node.props.testID === testID)
    .flatMap((view) => view.findAll((node) => isHost(node, 'Text')))
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

/** Frame by frame values of a toast over `ms`, starting with the current one. */
const record = (view: ReactTestInstance, ms: number) => {
  const frames: Motion[] = [motionOf(view)];
  for (let elapsed = 0; elapsed < ms; elapsed += 16) {
    advance(16);
    frames.push(motionOf(view));
  }
  return frames;
};

const translateYs = (frames: Motion[]) => frames.map((f) => f.translateY);

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

  it('a toast hidden before it is drawn never shows', () => {
    const onToastableHide = jest.fn();
    render(<Toastable />);
    act(() => {
      showToastable({ message: 'never', onToastableHide });
      hideToastable();
      showToastable({ message: 'next' });
    });
    expect(messages()).toEqual(['next']);
    expect(onToastableHide).toHaveBeenCalledTimes(1);
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

describe('motion', () => {
  it('springs in from just above its place with a small overshoot', () => {
    render(<Toastable />);
    show({ message: 'hello' });
    const frames = record(toastView(), 1000);
    const ys = translateYs(frames);

    // Starts on screen, 36 px above its place, transparent and a bit smaller.
    expect(frames[0]).toEqual({ opacity: 0, translateY: -36, scale: 0.95 });
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(-36);
    // Visible within the first frames, fully opaque after the fade.
    expect(frames[2]!.opacity).toBeGreaterThan(0.2);
    expect(frames[12]!.opacity).toBe(1);
    // Goes a few px past its place, then settles on it.
    expect(Math.max(...ys)).toBeGreaterThan(3);
    expect(Math.max(...ys)).toBeLessThan(8);
    expect(ys[ys.length - 1]).toBe(0);
  });

  it('springConfig tunes the entrance spring', () => {
    render(<Toastable springConfig={{ damping: 40 }} />);
    show({ message: 'no bounce' });
    const ys = translateYs(record(toastView(), 1000));
    expect(Math.max(...ys)).toBeLessThanOrEqual(0.5);
    expect(ys[ys.length - 1]).toBe(0);
  });

  it('a bottom toast comes in from below', () => {
    render(<Toastable position="bottom" />);
    show({ message: 'from below' });
    const ys = translateYs(record(toastView(), 1000));
    expect(ys[0]).toBe(36);
    expect(Math.min(...ys)).toBeLessThan(-3);
    expect(ys[ys.length - 1]).toBe(0);
  });

  it('the timing entrance runs over animationInTiming from just above', () => {
    render(<Toastable animationType="timing" animationInTiming={400} />);
    show({ message: 'timing' });
    const ys = translateYs(record(toastView(), 600));
    expect(ys[0]).toBe(-36);
    expect(Math.max(...ys)).toBe(0);
    expect(ys[Math.round(400 / 16) + 1]).toBe(0);
  });

  it('the auto-hide timer starts once the entrance has settled', () => {
    render(<Toastable duration={1000} />);
    show({ message: 'timed' });
    // Entrance (under 0.7 s) plus duration, and the toast is still there.
    advance(1600);
    expect(messages()).toEqual(['timed']);
    advance(700);
    expect(messages()).toEqual([]);
  });

  it('the exit plays on screen: a short lift while it fades', () => {
    render(<Toastable duration={60000} />);
    show({ message: 'bye' });
    advance(1000);
    const view = toastView();
    hide();
    const frames = record(view, 272);
    const ys = translateYs(frames);

    expect(ys.every((y) => y <= 0 && y >= -36)).toBe(true);
    // Still near its place a few frames in, and visibly fading.
    expect(ys[4]).toBeGreaterThan(-8);
    expect(frames[8]!.opacity).toBeGreaterThan(0.3);
    expect(frames[8]!.opacity).toBeLessThan(0.9);
  });
});

describe('touch', () => {
  it('a finger resting on the toast pauses it; letting go resumes the rest', () => {
    render(<Toastable duration={2000} />);
    show({ message: 'reading' });
    advance(1000);

    const finger = touch(toastView()).down();
    advance(10000);
    expect(messages()).toEqual(['reading']);

    finger.up();
    // About 1.6 s were left when the finger landed.
    advance(1000);
    expect(messages()).toEqual(['reading']);
    advance(1100);
    expect(messages()).toEqual([]);
  });

  it('letting go near the end still leaves a moment to read', () => {
    render(<Toastable duration={1000} />);
    show({ message: 'almost gone' });
    advance(1550);

    const finger = touch(toastView()).down();
    advance(3000);
    finger.up();
    advance(900);
    expect(messages()).toEqual(['almost gone']);
    advance(500);
    expect(messages()).toEqual([]);
  });

  it('a finger that lands during the entrance holds the toast too', () => {
    render(<Toastable duration={1000} />);
    show({ message: 'early' });
    advance(50);

    const finger = touch(toastView()).down();
    advance(5000);
    expect(messages()).toEqual(['early']);
    finger.up();
    advance(1500);
    expect(messages()).toEqual([]);
  });
});

describe('leaving toasts', () => {
  it('a finger that drags a leaving toast does not stall the queue', () => {
    render(<Toastable duration={60000} />);
    show({ message: 'first' });
    advance(1000);

    const finger = touch(toastView()).down();
    hide();
    advance(48);
    // The exit is under way when the finger starts to drag.
    expect(motionOf(toastView()).opacity).toBeLessThan(1);
    finger.move(-6).move(-10).up();
    advance(1000);
    expect(messages()).toEqual([]);

    show({ message: 'second' });
    advance(1000);
    expect(messages()).toEqual(['second']);
  });

  it('a responder taking over a leaving toast does not stall the queue', () => {
    const onToastableHide = jest.fn();
    render(<Toastable duration={1000} />);
    show({ message: 'first', onToastableHide });
    show({ message: 'second' });
    advance(1500);
    // A parent responder (a ScrollView, a navigator gesture) can take the
    // touch from the toast at any time.
    const view = toastView();
    hide();
    advance(32);
    act(() => view.props.onResponderTerminate?.({ touchHistory: {} }));
    advance(1000);
    expect(onToastableHide).toHaveBeenCalledTimes(1);
    expect(messages()).toEqual(['second']);
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

  it('a burst within one tick still keeps maxStack toasts', () => {
    render(<Toastable displayMode="stack" maxStack={2} duration={60000} />);
    act(() => {
      showToastable({ message: 'one' });
      showToastable({ message: 'two' });
      showToastable({ message: 'three' });
    });
    advance(1000);
    expect(messages()).toEqual(['two', 'three']);
  });
});

describe('hosts', () => {
  // The second host stands for a <Toastable /> rendered inside a Modal.
  const App = ({ modal }: { modal: boolean }) => (
    <View>
      <View testID="root">
        <Toastable duration={1000} />
      </View>
      {modal ? (
        <View testID="modal">
          <Toastable duration={1000} />
        </View>
      ) : null}
    </View>
  );

  it('a host inside a modal takes over, then hands back to the root host', () => {
    render(<App modal={false} />);
    rerender(<App modal />);
    show({ message: 'in the modal' });
    advance(500);
    expect(messagesIn('modal')).toEqual(['in the modal']);
    expect(messagesIn('root')).toEqual([]);

    advance(3000);
    rerender(<App modal={false} />);
    show({ message: 'after the modal' });
    advance(500);
    expect(messagesIn('root')).toEqual(['after the modal']);
  });

  it('a toast shown right before its host unmounts moves to the next host', () => {
    render(<App modal />);
    act(() => {
      showToastable({ message: 'saved' });
      renderer!.update(<App modal={false} />);
    });
    advance(500);
    expect(messagesIn('root')).toEqual(['saved']);
  });

  it('toasts on screen and queued in a closing modal move to the root host', () => {
    render(<App modal />);
    show({ message: 'one' });
    show({ message: 'two' });
    advance(500);
    expect(messagesIn('modal')).toEqual(['one']);

    rerender(<App modal={false} />);
    expect(messagesIn('root')).toEqual(['one']);
    advance(3000);
    expect(messagesIn('root')).toEqual(['two']);
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
