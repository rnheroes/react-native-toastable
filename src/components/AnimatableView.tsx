import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Animated, ViewProps } from 'react-native';

import type { AnimatableViewRef } from '../types';
import {
  ANIMATION_TRANSLATE,
  ANIMATION_VALUE,
  ANIMATION_CONFIG,
} from '../constants';

export const AnimatableView = forwardRef<AnimatableViewRef, ViewProps>(
  (props, ref) => {
    const isAnimating = useRef(false);
    const translateY = useRef(new Animated.Value(0));
    const translateX = useRef(new Animated.Value(0));

    useImperativeHandle(ref, () => ({
      animate: (animationType, duration) => {
        if (isAnimating.current) {
          return Promise.resolve();
        }

        isAnimating.current = true;

        return new Promise((resolve) => {
          if (animationType === 'slideInUp') {
            translateY.current.setValue(1000);
            translateX.current.setValue(0);
          }

          if (animationType === 'slideInDown') {
            translateY.current.setValue(-1000);
            translateX.current.setValue(0);
          }
          const translate = ANIMATION_TRANSLATE[animationType];
          const node =
            translate === 'translateX'
              ? translateX.current
              : translateY.current;
          const value = ANIMATION_VALUE[animationType][translate];

          Animated.timing(node, {
            ...ANIMATION_CONFIG,
            toValue: value,
            duration,
          }).start(() => {
            isAnimating.current = false;
            resolve();
          });
        });
      },
    }));

    return (
      <Animated.View
        {...props}
        style={[
          props.style,
          {
            transform: [
              { translateY: translateY.current },
              { translateX: translateX.current },
            ],
          },
        ]}
      >
        {props.children}
      </Animated.View>
    );
  }
);
