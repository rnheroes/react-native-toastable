import { createRef } from 'react';

import type { ToastableBodyParams, ToastableRef } from '../types';

const toastableQueue: Array<ToastableBodyParams> = [];
let isToastableVisible = false;

const enqueue = (toastableBody: ToastableBodyParams): void => {
  toastableQueue.push(toastableBody);

  if (!isToastableVisible) {
    processNextToastable();
  }
};

const dequeue = (): ToastableBodyParams | null =>
  toastableQueue.shift() ?? null;

export const processNextToastable = () => {
  const toastableBody = dequeue();

  if (!toastableBody) {
    isToastableVisible = false;
    return;
  }

  isToastableVisible = true;
  toastableRef.current?.showToastable(toastableBody);
};

/**
 * Show toastable with given params and enqueue it if there is already a toastable visible on screen
 * @param item ToastableBodyParams
 * */
export const showToastable = (item: ToastableBodyParams) => enqueue(item);
/**
 * Hide the current toastable
 *
 */
export const hideToastable = () => {
  toastableRef.current?.hideToastable();
};

export const toastableRef = createRef<ToastableRef>();
