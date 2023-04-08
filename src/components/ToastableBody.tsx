import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { PALETTE, STATUS_MAP } from '../constants';
import type { ToastableBodyProps } from '../types';

export const ToastableBody = ({
  message,
  onPress,
  status = 'info',
  backgroundColor,
  contentStyle,
  textColor = PALETTE['white-500'],
  statusMap = STATUS_MAP,
}: ToastableBodyProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={[
        { backgroundColor: backgroundColor ?? statusMap[status] },
        styles.content,
        contentStyle,
      ]}
    >
      <Text style={{ color: textColor }}>{message}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    borderRadius: 12,
  },
});
