import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StyleSheet } from 'react-native';

import {
  MAX_TOASTABLE_HEIGHT,
  TOASTER_ANIMATION_DURATION,
  TOASTER_DURATION,
} from '../constants';
import type {
  ToastableBodyParams,
  ToastableProps,
  ToastableRef,
} from '../types';
import { ToastableBody } from './ToastableBody';
import { ToastableWrapper } from './ToastableWrapper';

export const ToastableCore = forwardRef<ToastableRef, ToastableProps>(
  (
    {
      animationInTiming = TOASTER_ANIMATION_DURATION,
      animationOutTiming = TOASTER_ANIMATION_DURATION,
      swipeDirection = ['right', 'left', 'up'],
      ...props
    },
    ref
  ) => {
    const [isVisible, setVisible] = useState<boolean>(false);
    const [data, setData] = useState<ToastableBodyParams | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isAlwaysVisible = props?.alwaysVisible || data?.alwaysVisible;
    const duration = props.duration ?? data?.duration ?? TOASTER_DURATION;
    animationInTiming = data?.animationInTiming ?? animationInTiming;
    animationOutTiming = data?.animationOutTiming ?? animationOutTiming;
    swipeDirection = data?.swipeDirection ?? swipeDirection;

    useImperativeHandle(ref, () => ({ showToastable }));

    useEffect(() => {
      if (isAlwaysVisible) {
        return;
      }

      if (!isVisible) {
        timeoutRef?.current && clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        return;
      }

      timeoutRef.current = setTimeout(hide, duration);
    }, [isVisible, isAlwaysVisible, duration]);

    const showToastable = (param: ToastableBodyParams) => {
      setData(param);
      setVisible(true);
    };

    const onPress = () => {
      if (isAlwaysVisible) {
        hide();
      }

      data?.onPress?.();
    };

    const hide = () => {
      setVisible(false);
    };

    if (!data) {
      return null;
    }

    return (
      <ToastableWrapper
        style={[styles.container, props.containerStyle]}
        animationOutTiming={animationInTiming}
        animationInTiming={animationOutTiming}
        swipeDirection={swipeDirection}
        swipeThreshold={20}
        isVisible={isVisible}
        onSwipeComplete={(e) => {
          hide();
          console.log(e.swipingDirection);
        }}
        onToasterHide={() => {
          props.onToastableHide?.();
        }}
      >
        {typeof props.renderContent === 'function' ? (
          props.renderContent(data)
        ) : (
          <ToastableBody
            {...data}
            statusMap={props.statusMap}
            onPress={onPress}
          />
        )}
      </ToastableWrapper>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    maxHeight: MAX_TOASTABLE_HEIGHT,
    marginHorizontal: 24,
  },
});
