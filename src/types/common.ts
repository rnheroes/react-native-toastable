import type { ColorValue, TextProps, ViewProps } from 'react-native';

export type ToastableMessageStatus = 'success' | 'danger' | 'warning' | 'info';

// TODO: Improve type, add dynamic type
export type ToastableBodyParams = {
  renderContent?: (props: ToastableBodyParams) => React.ReactNode;
  contentStyle?: ViewProps['style'];
  backgroundColor?: ColorValue;
  textColor?: ColorValue;
  status?: ToastableMessageStatus;
  message?: TextProps['children'];
  onPress?: () => void;
  duration?: number;
  alwaysVisible?: boolean;
  animationOutTiming?: number;
  animationInTiming?: number;
  swipeDirection?: 'up' | 'left' | 'right' | Array<'up' | 'left' | 'right'>;
};

export type SwipeDirection = 'up' | 'left' | 'right' | 'down';

// TODO: Support animationIn, animationOut props
export type ToastableProps = Omit<
  ToastableBodyParams,
  | 'textColor'
  | 'backgroundColor'
  | 'status'
  | 'message'
  | 'onPress'
  | 'contentStyle'
> & {
  statusMap?: StatusMap;
  onToastableHide?: () => void;
  containerStyle?: ViewProps['style'];
};

export type ToastableRef = {
  showToastable: (param: ToastableBodyParams) => void;
} | null;

export type StatusMap = Record<ToastableMessageStatus, ColorValue>;

export type ToastableBodyProps = Pick<
  ToastableBodyParams,
  | 'message'
  | 'onPress'
  | 'status'
  | 'backgroundColor'
  | 'contentStyle'
  | 'textColor'
> &
  Pick<ToastableProps, 'statusMap'>;
