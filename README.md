# react-native-toastable

[![npm](https://img.shields.io/npm/dm/react-native-toastable)](https://www.npmjs.com/package/react-native-toastable)
![npm bundle size](https://img.shields.io/bundlephobia/min/react-native-toastable)
[![HitCount](https://hits.dwyl.com/rnheroes/react-native-toastable.svg?style=flat-square&show=unique)](http://hits.dwyl.com/rnheroes/react-native-toastable)

🍞 Blazingly fast and fully customizable Toaster component for React Native

- Supports queuinge, so you can display multiple toasts in succession without having to worry about them overlapping or interfering with each other
- Fully typed, using TypeScript
- Supports swipe to dismiss multiple directions (left, right, up)
- Pauses while a finger is on the toast, so it never leaves while being read or dragged
- Performant, using native animations and avoiding unnecessary re-renders
- Zero external dependencies
- Highly customizable, allowing you to tailor it to fit your specific needs


https://user-images.githubusercontent.com/43743872/230865010-6c1c7890-2eec-47c1-bbe4-44c6c6379037.mp4


## Installation

```sh
yarn add react-native-toastable
```

or

```sh
npm install react-native-toastable
```

## Usage
Place `Toastable` component at the root of your app, and import `showToastable` function anywhere in your app to show or `hideToastable` to hide toast.

Note: **If you need to use top inset of the device, Toastable must be child of `SafeAreaProvider`, otherwise you can use any value for `offset` prop, default is `56`.**

```js
import { View } from 'react-native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import Toastable from 'react-native-toastable';

export default function App() {
    return (
        <SafeAreaProvider>
            <RootNavigation />
        </SafeAreaProvider>
    );
}

export default function RootNavigation() {
    const { top } = useSafeAreaInsets();

    return (
        <View style={{ flex:1 }}>
            <NavigationContainer />
            <Toastable
                statusMap={{
                    success: 'red'
                    danger: 'yellow'
                    warning: 'green'
                    info: 'blue'
                }}
                offset={top}
            />
        </View>
    );
}

import { View, Button } from 'react-native';
import { hideToastable, showToastable } from 'react-native-toastable';

export default function HomeScreen() {
    return (
        <View style={{flex:1}}>
            <Button
                title="Show Toastable"
                onPress={() => showToastable({ message: 'React Native Heroes is awesome! 🚀', status:'success' })}
            />
            <Button
                title="Hide Toastable"
                onPress={() => hideToastable()}
            />
        </View>
    );
}
```


## Toasts and modals

A React Native `Modal` draws above the rest of the app (on Android it is a separate window), so a `Toastable` at the root of the app is hidden while a modal is open. Render another `Toastable` as the last child of the modal:

```tsx
<Modal visible={visible} onRequestClose={close}>
  <ModalContent />
  <Toastable offset={top} />
</Modal>
```

The most recently mounted `Toastable` shows the toasts, and toasts on screen or waiting move with it: into the modal's `Toastable` when the modal opens, and back to the root one when it closes. Calling `showToastable()` right before opening or closing a modal still shows the toast.

### Above native modals on iOS

On iOS, native modals (React Navigation's `modal` and `formSheet` presentations, `Modal`, pickers, share sheets) are view controllers presented above the root view, so they cover a `Toastable` at the root. `renderContainer` wraps the toast layer in whatever you pass, so you can draw it in [react-native-screens](https://github.com/software-mansion/react-native-screens)' `FullWindowOverlay`, which sits in the key window above every screen and modal. react-native-screens stays your dependency; this library does not need it.

```tsx
import { Platform } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

<Toastable
  offset={top}
  renderContainer={(toasts) =>
    Platform.OS === 'ios' ? (
      <FullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>
        {toasts}
      </FullWindowOverlay>
    ) : (
      toasts
    )
  }
/>
```

- `FullWindowOverlay` only goes above the modals that are already open when it mounts. The container is rendered only while a toast is on screen and, in `'queue'` mode, mounted again for every toast, so each toast lands above the modals open at that moment. A toast that is already up when a modal opens stays under it, unless the modal has its own `Toastable` (see above).
- `unstable_accessibilityContainerViewIsModal={false}` (react-native-screens 4.11 and later) keeps the rest of the app reachable with VoiceOver while a toast is up. Without it the overlay acts as a modal for VoiceOver and hides everything behind it.
- Touches outside the toast pass through to the app underneath.
- `FullWindowOverlay` is iOS only. On Android keep the plain layer and mount a `Toastable` inside each `Modal`.

## Props
Inherit all other props from `ToastableBodyParams` interface. Except `backgroundColor`, `status`, `message`, `onPress`, `contentStyle` props.

| Property            | Type                 | Description                                                                                             | Default                                                   |
|---------------------|----------------------|---------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------|
| statusMap           | `StatusMap`            | Status map, used to determine background color based on status                                         | `success: '#00BFA6', danger: '#FF5252', warning: '#FFD600', info: '#2962FF'` |
| onToastableHide     | `Func`           | Callback when toast is dismissed                                                                        | `undefined`                                                       |
| containerStyle      | `ViewProps['style']`   | Container style for toast container                                                                     | `undefined`                                                       |
position | `'top' \| 'center'` | Toast position. | `'top'` |
offset | `number` | Toast offset. | `56` |
| renderContainer | `(toasts: ReactNode) => ReactNode` | Wraps the toast layer, e.g. in `FullWindowOverlay` to draw above native modals on iOS. See [Above native modals on iOS](#above-native-modals-on-ios). | `undefined` |

## ToastableBodyParams

| Params         | Type                                                      | Description                                                                                                                    | Default   |
| ---------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------- |
| renderContent    | `(props: ToastableBodyParams) => React.ReactNode`         | Render custom content, if this is set, message will be ignored.                                                               | `undefined`         |
| contentStyle     | `ViewProps['style']`                                      | Custom content style.                                                                                                           | `undefined` |
| backgroundColor  | `ColorValue`                                              | Custom background color, if this is set, status will be ignored.                                                               | `undefined` |
| status           | `ToastableMessageStatus`                                  | Message status, this will be used to determine background color based on `statusMap` prop.                                     | `'info'`   |
| message          | `TextProps['children']`                                    | Message to be displayed.                                                                                                         | `undefined`      |
| onPress          | `Func`                                              | On press callback.                                                                                                              | `undefined` |
| duration         | `number`                                                  | Duration in milliseconds.                                                                                                       | `3000`    |
| alwaysVisible    | `boolean`                                                 | Make toast always visible, even when there is a new toast.                                                                       | `false`   |
| animationOutTiming | `number`                                                | Animation timing for toast out in milliseconds.                                                                                 | `300`     |
| animationInTiming  | `number`                                                | Animation timing for toast in in milliseconds.                                                                                  | `300`     |
| swipeDirection   | `'up' \| 'left' \| 'right' \| Array<'up' \| 'left' \| 'right'>` | Swipe direction to dismiss toast.                                                                                               | `'up'`    |
titleColor | `ColorValue` | Custom title color, if this is set. | `'#FFFFFF'` | 
| messageColor | `ColorValue` | Custom message color, if this is set. | `'#FFFFFF'` |
titleStyle | `TextStyle` | Custom title style. | `undefined` |
messageStyle | `TextStyle` | Custom message style. | `undefined` |
position | `'top' \| 'bottom'\| 'center'` | Toast position. | `'top'` |
offset | `number` | Toast offset. | `56` |
| animationType | `'spring' \| 'timing'` | Entrance curve. `'spring'` comes in from just outside its place with a small overshoot; `'timing'` eases in over `animationInTiming`. | `'spring'` |
| springConfig | `{ stiffness?: number; damping?: number; mass?: number }` | Entrance spring, merged over the default. Raise `damping` (e.g. `30`) for no overshoot. | `{ stiffness: 200, damping: 15, mass: 1 }` |
| announceForAccessibility | `boolean` | Announce `title` and `message` to screen readers (VoiceOver, TalkBack) when the toast appears. Only text is read. | `true` |

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## Roadmap

- Add more examples
- Support animationIn and animationOut props
- Support stackable toasts
- Support custom animations
- Add custom status support

## Inspiration

- [react-native-modal](https://github.com/react-native-modal/react-native-modal)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
