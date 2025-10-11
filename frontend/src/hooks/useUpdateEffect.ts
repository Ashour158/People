import React, { useEffect, useRef } from 'react';

/**
 * Hook for running effect only on component update (not on mount)
 */
export const useUpdateEffect = (
  effect: () => void | (() => void),
  deps: React.DependencyList
): void => {
  const isMounted = useRef(false);

  useEffect(() => {
    if (isMounted.current) {
      return effect();
    } else {
      isMounted.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
