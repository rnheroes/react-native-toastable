import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import {
  TOASTABLE_ANIMATION_DURATION,
  TOASTABLE_DEFAULT_SWIPE_DIRECTIONS,
  TOASTABLE_DURATION,
  TOASTABLE_MAX_STACK,
  TOASTABLE_OFFSET,
  TOASTABLE_PALETTE,
  TOASTABLE_STACK_GAP,
  TOASTABLE_STATUS_MAP,
} from '../constants';
import type { ToastableBodyParams, ToastableProps } from '../types';
import { registerToastableHost } from '../utils/controller';
import type { ToastableHost } from '../utils/controller';
import { ToastItem, ToastItemHandle } from './ToastItem';

type ActiveToast = ToastableBodyParams & { __id: number };

let nextId = 0;

const toParams = ({ __id: _id, ...item }: ActiveToast): ToastableBodyParams =>
  item;

export const Toastable = ({
  animationInTiming = TOASTABLE_ANIMATION_DURATION,
  animationOutTiming = TOASTABLE_ANIMATION_DURATION,
  animationType = 'spring',
  swipeDirection = TOASTABLE_DEFAULT_SWIPE_DIRECTIONS,
  duration = TOASTABLE_DURATION,
  statusMap = TOASTABLE_STATUS_MAP,
  titleColor = TOASTABLE_PALETTE['white-500'],
  messageColor = TOASTABLE_PALETTE['white-500'],
  titleStyle,
  messageStyle,
  position = 'top',
  offset = TOASTABLE_OFFSET,
  alwaysVisible = false,
  containerStyle,
  displayMode = 'queue',
  maxStack = TOASTABLE_MAX_STACK,
  stackGap = TOASTABLE_STACK_GAP,
  onToastableHide,
  renderContent,
}: ToastableProps) => {
  const [active, setActive] = useState<ActiveToast[]>([]);
  // The toasts on screen, kept in step synchronously; `active` mirrors it for
  // rendering. Nothing is decided inside a state updater, so a toast shown
  // and handed to another host in the same tick is not lost.
  const activeRef = useRef<ActiveToast[]>([]);
  const queueRef = useRef<ToastableBodyParams[]>([]);
  // Toasts that have started their exit.
  const closingRef = useRef(new Set<number>());
  const itemRefs = useRef(new Map<number, ToastItemHandle>());
  const settingsRef = useRef({ displayMode, maxStack, onToastableHide });
  settingsRef.current = { displayMode, maxStack, onToastableHide };

  // Created once, so the host keeps its place among the mounted hosts while
  // its props change.
  const [{ host, remove }] = useState(() => {
    const commit = (next: ActiveToast[]) => {
      activeRef.current = next;
      setActive(next);
    };

    const removeToast = (id: number) => {
      closingRef.current.delete(id);
      itemRefs.current.delete(id);
      const rest = activeRef.current.filter((t) => t.__id !== id);
      const next =
        settingsRef.current.displayMode === 'queue'
          ? queueRef.current.shift()
          : undefined;
      commit(next ? [...rest, { ...next, __id: nextId++ }] : rest);
      settingsRef.current.onToastableHide?.();
    };

    // Starts the exit of a toast. One that has not been drawn yet (shown and
    // hidden within the same tick) is dropped right away.
    const closeToast = (toast: ActiveToast) => {
      const handle = itemRefs.current.get(toast.__id);
      if (handle) {
        handle.close();
        return;
      }
      toast.onToastableHide?.();
      removeToast(toast.__id);
    };

    const toastableHost: ToastableHost = {
      showToastable: (item) => {
        const { displayMode: mode, maxStack: max } = settingsRef.current;
        const current = activeRef.current;
        if (mode === 'queue' && current.length > 0) {
          queueRef.current.push(item);
          return;
        }
        commit([...current, { ...item, __id: nextId++ }]);
        if (mode !== 'stack') return;
        // Trim back to maxStack, oldest first, counting only the toasts that
        // are not already leaving, so a burst faster than one exit animation
        // still ends up with maxStack toasts.
        const staying = activeRef.current.filter(
          (t) => !closingRef.current.has(t.__id)
        );
        staying.slice(0, Math.max(0, staying.length - max)).forEach(closeToast);
      },
      hideToastable: () => {
        // The most recently shown toast that is not already leaving.
        const top = [...activeRef.current]
          .reverse()
          .find((t) => !closingRef.current.has(t.__id));
        if (top) closeToast(top);
      },
      takePending: () => {
        const shown = activeRef.current
          .filter((t) => !closingRef.current.has(t.__id))
          .map(toParams);
        const queued = queueRef.current;
        activeRef.current = [];
        queueRef.current = [];
        return [...shown, ...queued];
      },
    };

    return { host: toastableHost, remove: removeToast };
  });

  useEffect(() => registerToastableHost(host), [host]);

  if (active.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={[styles.host, containerStyle]}>
      {active.map((item, index) => {
        const stackIndex =
          displayMode === 'stack' ? active.length - 1 - index : 0;
        return (
          <ToastItem
            key={item.__id}
            ref={(handle) => {
              if (handle) itemRefs.current.set(item.__id, handle);
              else itemRefs.current.delete(item.__id);
            }}
            data={{
              ...item,
              renderContent: item.renderContent ?? renderContent,
            }}
            stackIndex={stackIndex}
            stackGap={stackGap}
            position={position}
            offset={offset}
            animationType={animationType}
            animationInTiming={animationInTiming}
            animationOutTiming={animationOutTiming}
            duration={duration}
            alwaysVisible={alwaysVisible}
            swipeDirection={swipeDirection}
            statusMap={statusMap}
            titleColor={titleColor}
            messageColor={messageColor}
            titleStyle={titleStyle}
            messageStyle={messageStyle}
            onClosing={() => closingRef.current.add(item.__id)}
            onHide={() => remove(item.__id)}
          />
        );
      })}
    </View>
  );
};
Toastable.displayName = 'Toastable';

const WINDOW = Dimensions.get('window');

const styles = StyleSheet.create({
  // Explicit window dimensions instead of absoluteFillObject. Under Fabric,
  // absoluteFillObject (position:absolute + left/right/top/bottom:0) is
  // sometimes treated as auto-sized by Yoga when nested inside a flex parent
  // with alignItems, leaving the host effectively 0×0. That made
  // top:offset on the ToastItem fall through to an unexpected screen Y.
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: WINDOW.width,
    height: WINDOW.height,
    zIndex: 1,
  },
});
