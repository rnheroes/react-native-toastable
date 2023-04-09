import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { TOASTABLE_PALETTE, TOASTABLE_STATUS_MAP } from '../constants';
import type { ToastableBodyProps } from '../types';

export const ToastableBody = ({
  message,
  onPress,
  status = 'info',
  backgroundColor,
  contentStyle,
  statusMap = TOASTABLE_STATUS_MAP,
  renderContent,
  title,
  titleColor = TOASTABLE_PALETTE['white-500'],
  titleStyle,
  messageColor = TOASTABLE_PALETTE['white-500'],
  messageStyle,
}: ToastableBodyProps) => {
  if (typeof renderContent === 'function') {
    return (
      <>
        {renderContent({
          message,
          status,
          title,
          onPress,
        })}
      </>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={[
        { backgroundColor: backgroundColor ?? statusMap[status] },
        styles.content,
        contentStyle,
      ]}
    >
      {title && (
        <Text style={[{ color: titleColor }, styles.title, titleStyle]}>
          {title}
        </Text>
      )}
      {message && (
        <Text style={[{ color: messageColor }, messageStyle]}>{message}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 16,
  },
});
