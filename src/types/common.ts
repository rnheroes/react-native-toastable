import type { ColorValue, TextProps, ViewProps } from 'react-native';

export type ToastableMessageStatus = 'success' | 'danger' | 'warning' | 'info';

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

export type ToastablePosition = 'top' | 'bottom' | 'center';

export type ToastableAnimationType = 'spring' | 'timing';

export type ToastableDisplayMode = 'queue' | 'stack';

export type StatusMap = Record<ToastableMessageStatus, ColorValue>;

export type ToastableBodyParams = {
  /**
   * Render custom content. If set, `message`/`title` are passed through but the
   * default body layout is replaced entirely.
   */
  renderContent?: (
    props: Pick<ToastableBodyParams, 'message' | 'title' | 'status' | 'onPress'>
  ) => React.ReactNode;
  /** Custom content style for the default body. */
  contentStyle?: ViewProps['style'];
  /** Override background color. Takes precedence over `status`. */
  backgroundColor?: ColorValue;
  /** Status used to pick a background color from `statusMap`. @default 'info' */
  status?: ToastableMessageStatus;
  /** Main message text. */
  message: TextProps['children'];
  /** Optional title text above the message. */
  title?: TextProps['children'];
  /** Press handler for the default body. */
  onPress?: () => void;
  /** Auto-hide duration in ms. Timer starts after entry animation. @default 2000 */
  duration?: number;
  /** Keep toast visible until manually hidden (ignores `duration`). @default false */
  alwaysVisible?: boolean;
  /** Entry animation duration in ms (only when `animationType === 'timing'`). @default 300 */
  animationInTiming?: number;
  /** Exit animation duration in ms (only when `animationType === 'timing'`). @default 300 */
  animationOutTiming?: number;
  /** Allowed swipe-to-dismiss directions. @default ['up', 'left', 'right'] */
  swipeDirection?: SwipeDirection | SwipeDirection[];
  /** Message text color. @default '#FFFFFF' */
  messageColor?: ColorValue;
  /** Title text color. @default '#FFFFFF' */
  titleColor?: ColorValue;
  /** Title text style. */
  titleStyle?: TextProps['style'];
  /** Message text style. */
  messageStyle?: TextProps['style'];
  /** Toast position on screen. @default 'top' */
  position?: ToastablePosition;
  /** Distance from the edge (top/bottom) in px. @default 56 */
  offset?: number;
  /** Animation curve. @default 'spring' */
  animationType?: ToastableAnimationType;
  /** Called once the toast is fully hidden (after swipe, timeout, or manual hide). */
  onToastableHide?: () => void;
};

export type ToastableProps = Omit<
  ToastableBodyParams,
  'backgroundColor' | 'status' | 'message' | 'onPress' | 'contentStyle'
> & {
  /**
   * Color map for status backgrounds.
   * @default { success: '#00BFA6', danger: '#FF5252', warning: '#FFD600', info: '#2962FF' }
   */
  statusMap?: StatusMap;
  /** Style for the toast container (positioning, margins). */
  containerStyle?: ViewProps['style'];
  /** Distance from the edge in px. @default 56 */
  offset?: number;
  /**
   * `'queue'` shows one toast at a time and queues the rest; `'stack'` shows
   * multiple toasts piled together with `stackGap` between them.
   * @default 'queue'
   */
  displayMode?: ToastableDisplayMode;
  /** Max visible toasts in `'stack'` mode. Older toasts are dropped. @default 3 */
  maxStack?: number;
  /** Vertical gap between stacked toasts in px. @default 8 */
  stackGap?: number;
};

export type ToastableRef = {
  showToastable: (param: ToastableBodyParams) => void;
  hideToastable: () => void;
} | null;

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
