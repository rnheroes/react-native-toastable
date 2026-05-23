import { createRef } from 'react';

import type { ToastableBodyParams, ToastableRef } from '../types';

export const toastableRef = createRef<NonNullable<ToastableRef>>();

/**
 * Show a toast. In `displayMode="queue"` (default) the toast is queued if one
 * is already visible; in `"stack"` it's added to the visible stack.
 */
export const showToastable = (item: ToastableBodyParams) => {
  toastableRef.current?.showToastable(item);
};

/**
 * Hide the currently visible toast. In stack mode this hides the most
 * recently shown toast.
 */
export const hideToastable = () => {
  toastableRef.current?.hideToastable();
};
