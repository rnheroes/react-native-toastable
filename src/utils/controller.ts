import type { ToastableBodyParams } from '../types';

export type ToastableHost = {
  showToastable: (item: ToastableBodyParams) => void;
  hideToastable: () => void;
  /**
   * Empties the host and returns the toasts it still owed the user: the ones
   * on screen that are not leaving, then the queued ones.
   */
  takePending: () => ToastableBodyParams[];
};

/**
 * Mounted `<Toastable />` hosts, oldest first. The most recently mounted one
 * shows the toasts, so a host rendered inside a `Modal` takes over while the
 * modal is open and the root host takes back over when it closes.
 */
const hosts: ToastableHost[] = [];

/** Adds a host on top. Returns the function that removes it again. */
export const registerToastableHost = (host: ToastableHost) => {
  hosts.push(host);
  return () => {
    const index = hosts.lastIndexOf(host);
    if (index === -1) return;
    hosts.splice(index, 1);
    // A toast shown in a host that is going away (a modal closed right after
    // `showToastable`) moves to the host underneath instead of being lost.
    host.takePending().forEach(showToastable);
  };
};

/**
 * Show a toast. In `displayMode="queue"` (default) the toast is queued if one
 * is already visible; in `"stack"` it's added to the visible stack.
 */
export const showToastable = (item: ToastableBodyParams) => {
  hosts[hosts.length - 1]?.showToastable(item);
};

/**
 * Hide the currently visible toast. In stack mode this hides the most
 * recently shown toast.
 */
export const hideToastable = () => {
  hosts[hosts.length - 1]?.hideToastable();
};
