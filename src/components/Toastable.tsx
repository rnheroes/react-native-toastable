import React from 'react';

import type { ToastableProps } from '../types';
import { processNextToastable, toastableRef } from '../utils';
import { ToastableCore } from './ToastableCore';

export const Toastable = ({ ...props }: ToastableProps) => {
  return (
    <ToastableCore
      ref={toastableRef}
      {...props}
      onToastableHide={processNextToastable}
    />
  );
};
