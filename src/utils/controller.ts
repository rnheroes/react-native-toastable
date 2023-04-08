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

export const showToastable = (item: ToastableBodyParams) => enqueue(item);

export const toastableRef = createRef<ToastableRef>();
