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
   *  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor:TOASTABLE_STATUS_MAP[props.status] }}>
   *   <Text>{props.title}</Text>
   *  <Text>{props.message}</Text>
   * </View>
   * )}
   * ```
   */
  renderContent?: (
    props: Pick<ToastableBodyParams, 'message' | 'title' | 'status' | 'onPress'>
  ) => React.ReactNode;
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
   * Message status, this will be used to determine background color based on statusMap prop
   * @default 'info'
   */
  status?: ToastableMessageStatus;
  /**
   * Message to be displayed
   * @default ''
   */
  message: TextProps['children'];
  /**
   * Title to be displayed
   * @default ''
   * */
  title?: TextProps['children'];
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
  /**
   * Custom message color
   * @default #FFFFFF
   * */
  messageColor?: ColorValue;
  /**
   * Custom title color
   * @default #FFFFFF
   * */
  titleColor?: ColorValue;
  /**
   * Custom title style
   * @default undefined
   * */
  titleStyle?: TextProps['style'];
  /**
   * Custom message style
   * @default undefined
   * */
  messageStyle?: TextProps['style'];
  /**
   * Toast container position
   * @default 'top'
   * */
  position?: 'top' | 'bottom' | 'center';
  /**
   * Toast container offset
   * @default 56
   * */
  offset?: number;
};

export type SwipeDirection = 'up' | 'left' | 'right' | 'down';

// TODO: Support animationIn, animationOut props
export type ToastableProps = Omit<
  ToastableBodyParams,
  'backgroundColor' | 'status' | 'message' | 'onPress' | 'contentStyle'
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
  /**
   * Toast container offset
   * @default 56
   * */
  offset?: number;
};

export type ToastableRef = {
  showToastable: (param: ToastableBodyParams) => void;
  hideToastable: () => void;
} | null;

export type StatusMap = Record<ToastableMessageStatus, ColorValue>;

export type ToastableBodyProps = Pick<
  ToastableBodyParams,
  | 'message'
  | 'onPress'
  | 'status'
  | 'backgroundColor'
  | 'contentStyle'
  | 'renderContent'
  | 'title'
  | 'titleColor'
  | 'titleStyle'
  | 'messageColor'
  | 'messageStyle'
> &
  Pick<ToastableProps, 'statusMap'>;
