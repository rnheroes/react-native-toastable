import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { toastableRef } from '../utils/controller';
import { ToastItem, ToastItemHandle } from './ToastItem';

type ActiveToast = ToastableBodyParams & { __id: number };

let nextId = 0;

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
  const queueRef = useRef<ToastableBodyParams[]>([]);
  const itemRefs = useRef(new Map<number, ToastItemHandle>());

  const showToastable = useCallback(
    (item: ToastableBodyParams) => {
      const entry: ActiveToast = { ...item, __id: nextId++ };
      setActive((prev) => {
        if (displayMode === 'queue') {
          if (prev.length === 0) return [entry];
          queueRef.current.push(item);
          return prev;
        }
        const next = [...prev, entry];
        // Close every overflow toast, not just the first. If the user
        // bursts a few shows in under one exit-animation, the oldest item
        // is already closing — calling .close() on it is a no-op, so we
        // need to keep walking forward and close the next-oldest items
        // until we're back at maxStack.
        const overflow = next.length - maxStack;
        for (let i = 0; i < overflow; i++) {
          const candidate = next[i];
          if (candidate) itemRefs.current.get(candidate.__id)?.close();
        }
        return next;
      });
    },
    [displayMode, maxStack]
  );

  const removeById = useCallback(
    (id: number) => {
      setActive((prev) => {
        const filtered = prev.filter((t) => t.__id !== id);
        itemRefs.current.delete(id);

        if (displayMode === 'queue') {
          const nextItem = queueRef.current.shift();
          if (nextItem) {
            return [...filtered, { ...nextItem, __id: nextId++ }];
          }
        }
        return filtered;
      });
      onToastableHide?.();
    },
    [displayMode, onToastableHide]
  );

  const hideTopmost = useCallback(() => {
    setActive((prev) => {
      // Hide the most recently shown toast (LIFO). The item closes itself
      // through its handle, and `removeById` then drops it from state.
      const top = prev[prev.length - 1];
      if (top) itemRefs.current.get(top.__id)?.close();
      return prev;
    });
  }, []);

  useEffect(() => {
    (
      toastableRef as React.MutableRefObject<{
        showToastable: typeof showToastable;
        hideToastable: typeof hideTopmost;
      } | null>
    ).current = {
      showToastable,
      hideToastable: hideTopmost,
    };
    return () => {
      (toastableRef as React.MutableRefObject<unknown>).current = null;
    };
  }, [showToastable, hideTopmost]);

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
            onHide={() => removeById(item.__id)}
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
