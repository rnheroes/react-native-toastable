import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StyleSheet } from 'react-native';

import {
  TOASTABLE_ANIMATION_DURATION,
  TOASTABLE_DURATION,
  TOASTABLE_PALETTE,
  TOASTABLE_STATUS_MAP,
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
      animationInTiming = TOASTABLE_ANIMATION_DURATION,
      animationOutTiming = TOASTABLE_ANIMATION_DURATION,
      swipeDirection = ['right', 'left', 'up'],
      renderContent,
      title,
      alwaysVisible = false,
      duration = TOASTABLE_DURATION,
      statusMap = TOASTABLE_STATUS_MAP,
      titleColor = TOASTABLE_PALETTE['white-500'],
      messageColor = TOASTABLE_PALETTE['white-500'],
      titleStyle,
      messageStyle,
      position = 'top',
      offset = 0,
      ...props
    },
    ref
  ) => {
    const [isVisible, setVisible] = useState<boolean>(false);
    const [data, setData] = useState<ToastableBodyParams | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    alwaysVisible = data?.alwaysVisible ?? alwaysVisible;
    duration = data?.duration ?? duration;
    animationInTiming = data?.animationInTiming ?? animationInTiming;
    animationOutTiming = data?.animationOutTiming ?? animationOutTiming;
    swipeDirection = data?.swipeDirection ?? swipeDirection;
    renderContent = data?.renderContent ?? renderContent;
    title = data?.title ?? title;
    titleColor = data?.titleColor ?? titleColor;
    titleStyle = data?.titleStyle ?? titleStyle;
    messageColor = data?.messageColor ?? messageColor;
    messageStyle = data?.messageStyle ?? messageStyle;
    position = data?.position ?? position;
    offset = data?.offset ?? offset;

    useImperativeHandle(ref, () => ({ showToastable, hideToastable: hide }));

    useEffect(() => {
      if (alwaysVisible) {
        return;
      }

      if (!isVisible) {
        timeoutRef?.current && clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        return;
      }

      timeoutRef.current = setTimeout(hide, duration);
    }, [isVisible, alwaysVisible, duration]);

    const showToastable = (param: ToastableBodyParams) => {
      setData(param);
      setVisible(true);
    };

    const onPress = () => {
      if (alwaysVisible) {
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
        style={[
          styles.container,
          props.containerStyle,
          POSITION_STYLE_MAP[position](offset),
        ]}
        animationOutTiming={animationInTiming}
        animationInTiming={animationOutTiming}
        swipeDirection={swipeDirection}
        swipeThreshold={20}
        isVisible={isVisible}
        onSwipeComplete={(_e) => {
          hide();
        }}
        onToasterHide={() => {
          props.onToastableHide?.();
        }}
      >
        <ToastableBody
          {...data}
          renderContent={renderContent}
          title={title}
          statusMap={statusMap}
          onPress={onPress}
          titleColor={titleColor}
          titleStyle={titleStyle}
          messageColor={messageColor}
          messageStyle={messageStyle}
        />
      </ToastableWrapper>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
  },
  top: {
    justifyContent: 'flex-start',
  },
  bottom: {
    justifyContent: 'flex-end',
  },
  center: {
    top: undefined,
    bottom: undefined,
    justifyContent: 'center',
  },
});

const POSITION_STYLE_MAP = {
  top: (value: number) => ({
    ...styles.top,
    top: value,
  }),
  bottom: (value: number) => ({
    ...styles.bottom,
    top: -value,
  }),
  center: (_value?: number) => ({
    ...styles.center,
    top: undefined,
    bottom: undefined,
  }),
};
