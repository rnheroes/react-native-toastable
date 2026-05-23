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
    return <>{renderContent({ message, status, title, onPress })}</>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.content,
        { backgroundColor: backgroundColor ?? statusMap[status] },
        contentStyle,
      ]}
    >
      {title ? (
        <Text style={[styles.title, { color: titleColor }, titleStyle]}>
          {title}
        </Text>
      ) : null}
      {message ? (
        <Text style={[{ color: messageColor }, messageStyle]}>{message}</Text>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    borderRadius: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
});
