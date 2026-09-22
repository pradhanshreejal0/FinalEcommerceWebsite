import { useEffect, useState } from "react";

/**
 * Returns `value`, but only updates after it stops changing for `delayMs`.
 * Used to avoid firing a network request on every keystroke.
 */
export function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
