import { useRef } from 'react';

export const useConstructor = (callBack = () => {}) => {
  const hasBeenCalled = useRef(false);
  if (hasBeenCalled.current) {
    return;
  }
  callBack();
  hasBeenCalled.current = true;
};
