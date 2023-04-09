import type { ColorValue, TextProps, ViewProps } from 'react-native';

export type ToastableMessageStatus = 'success' | 'danger' | 'warning' | 'info';

// TODO: Improve type, add dynamic type
export type ToastableBodyParams = {
  /**
   * Render custom content, if this is set, message will be ignored
   * @param props - ToastableBodyParams
   * @returns React.ReactNode
   * @example
   * ```tsx
   * renderContent={(props) => (
   *  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
   *   <Icon name="check" size={20} color={props.textColor} />
   *  <Text style={{ color: props.textColor }}>{props.message}</Text>
   * </View>
   * )}
   * ```
   */
  renderContent?: (props: ToastableBodyParams) => React.ReactNode;
  /**
   * Custom content style
   * @default undefined
   */
  contentStyle?: ViewProps['style'];
  /**
   * Custom background color, if this is set, status will be ignored
   * @default undefined
   */
  backgroundColor?: ColorValue;
  /**
   * Custom text color, if this is set
   * @default '#FFFFFF'
   */
  textColor?: ColorValue;
  /**
   * Message status, this will be used to determine background color based on statusMap prop
   * @default 'info'
   */
  status?: ToastableMessageStatus;
  /**
   * Message to be displayed
   * @default ''
   */
  message?: TextProps['children'];
  /**
   * On press callback
   * @default undefined
   * */
  onPress?: () => void;
  /**
   * Duration in milliseconds
   * @default 3000
   * */
  duration?: number;
  /**
   * Make toast always visible, even when there is a new toast
   * @default false
   * */
  alwaysVisible?: boolean;
  /**
   * Animation timing for toast out milliseconds
   * @default 300
   * */
  animationOutTiming?: number;
  /**
   * Animation timing for toast in milliseconds
   * @default 300
   * */
  animationInTiming?: number;
  /**
   * Swipe direction to dismiss toast
   * @default 'up'
   * */
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
  /**
   * Status map, this will be used to determine background color based on status prop
   * @default
   * success: '#00BFA6',
   * danger: '#FF5252',
   * warning: '#FFD600',
   * info: '#2962FF',
   * */
  statusMap?: StatusMap;
  /**
   * Callback when toast is dismissed, this will be called when toast is swiped out or duration is reached
   * @default undefined
   * */
  onToastableHide?: () => void;
  /**
   * Container style for toast container
   * @default undefined
   * */
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