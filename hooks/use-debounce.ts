import { useState, useEffect, useRef } from 'react';

/**
 * A custom hook that debounces a value by delaying updates for the specified delay period.
 * This helps reduce expensive operations like API calls during rapid changes (e.g., typing).
 * 
 * @template T The type of the value being debounced
 * @param {T} value The value to debounce
 * @param {number} delay The delay in milliseconds (default: 500ms)
 * @param {boolean} [leading=false] Whether to invoke on the leading edge of the timeout
 * @returns {T} The debounced value
 * 
 * @example
 * // Basic usage
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 * 
 * useEffect(() => {
 *   // This effect will only run when debouncedSearchTerm changes
 *   searchAPI(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 */
export function useDebounce<T>(value: T, delay = 500, leading = false): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const leadingCalledRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousValueRef = useRef<T>(value);
  
  useEffect(() => {
    // If value has changed
    if (value !== previousValueRef.current) {
      // For leading calls - trigger immediately on first change
      if (leading && !leadingCalledRef.current) {
        setDebouncedValue(value);
        leadingCalledRef.current = true;
      }
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        // Update the debounced value
        setDebouncedValue(value);
        // Reset the leading call flag after delay
        leadingCalledRef.current = false;
      }, delay);
      
      // Update previousValue ref
      previousValueRef.current = value;
    }
    
    // Cleanup on unmount or when value/delay changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay, leading]);
  
  return debouncedValue;
}

/**
 * A hook that returns a function that will only be called after it stops being
 * invoked for the specified delay milliseconds.
 * 
 * @template T The type of function to debounce
 * @param {T} fn The function to debounce
 * @param {number} delay The delay in milliseconds (default: 500ms)
 * @param {Object} [options] Additional options
 * @param {boolean} [options.leading=false] Whether to invoke on the leading edge of the timeout
 * @param {Array<any>} [options.dependencies=[]] Array of dependencies to watch for reinitialization 
 * @returns {T} The debounced function
 * 
 * @example
 * // Debounce a function
 * const handleSearch = useDebounceCallback(
 *   (term) => {
 *     searchAPI(term);
 *   },
 *   300
 * );
 * 
 * // Usage
 * <input onChange={(e) => handleSearch(e.target.value)} />
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  fn: T,
  delay = 500,
  options: { leading?: boolean; dependencies?: any[] } = {}
): T {
  const { leading = false, dependencies = [] } = options;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef<T>(fn);
  const leadingCalledRef = useRef(false);
  
  // Update the function ref when the function changes
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  
  const debouncedFn = useRef((...args: Parameters<T>): ReturnType<T> | undefined => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (leading && !leadingCalledRef.current) {
      leadingCalledRef.current = true;
      return fnRef.current(...args);
    }
    
    return new Promise<ReturnType<T>>((resolve) => {
      timeoutRef.current = setTimeout(() => {
        leadingCalledRef.current = false;
        const result = fnRef.current(...args);
        resolve(result);
      }, delay);
    }) as any;
  }).current;
  
  // Reset the debounced function when dependencies change
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      leadingCalledRef.current = false;
    };
  }, [...dependencies]);
  
  return debouncedFn as T;
}

/**
 * Hook for cancellable debounce with explicit cancel function
 * 
 * @template T The type of the value being debounced
 * @param {T} value The value to debounce
 * @param {number} delay The delay in milliseconds
 * @returns {[T, () => void]} A tuple containing the debounced value and a cancel function
 * 
 * @example
 * const [inputValue, setInputValue] = useState('');
 * const [debouncedValue, cancelDebounce] = useCancellableDebounce(inputValue, 300);
 * 
 * // Cancel debounce on a button click
 * <button onClick={cancelDebounce}>Cancel</button>
 */
export function useCancellableDebounce<T>(value: T, delay: number): [T, () => void] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const cancelDebounce = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };
  
  useEffect(() => {
    // Clear previous timeout
    cancelDebounce();
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    // Cleanup on unmount or when value/delay changes
    return cancelDebounce;
  }, [value, delay]);
  
  return [debouncedValue, cancelDebounce];
}

/**
 * Hook for debouncing updates to state.
 * 
 * @template T The type of the state value
 * @param {T} initialValue The initial state value
 * @param {number} delay The delay in milliseconds
 * @returns {[T, React.Dispatch<React.SetStateAction<T>>, T]} A tuple containing the current value, setter function, and debounced value
 * 
 * @example
 * const [value, setValue, debouncedValue] = useDebouncedState('', 300);
 * 
 * // Use value and setValue like normal useState, debouncedValue will update after delay
 * <input value={value} onChange={e => setValue(e.target.value)} />
 */
export function useDebouncedState<T>(initialValue: T, delay: number): [T, React.Dispatch<React.SetStateAction<T>>, T] {
  const [value, setValue] = useState<T>(initialValue);
  const debouncedValue = useDebounce<T>(value, delay);
  
  return [value, setValue, debouncedValue];
}

/**
 * Hook for asynchronous debounce with loading state
 * 
 * @template T The type of the value being debounced
 * @template R The type of the result from the async function
 * @param {T} value The value to debounce
 * @param {(value: T) => Promise<R>} asyncFn The async function to call with the debounced value
 * @param {number} delay The delay in milliseconds (default: 500ms)
 * @returns {[R | null, boolean, Error | null]} A tuple containing the result, loading state, and error
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const [results, isLoading, error] = useAsyncDebounce(
 *   searchTerm,
 *   async (term) => await searchAPI(term),
 *   300
 * );
 */
export function useAsyncDebounce<T, R>(
  value: T,
  asyncFn: (value: T) => Promise<R>,
  delay = 500
): [R | null, boolean, Error | null] {
  const [result, setResult] = useState<R | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  const debouncedValue = useDebounce<T>(value, delay);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await asyncFn(debouncedValue);
        if (isMounted) {
          setResult(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [debouncedValue, asyncFn]);
  
  return [result, isLoading, error];
}

/**
 * Hook that provides debounced state with previous value tracking
 * 
 * @template T The type of the state value
 * @param {T} value The value to debounce
 * @param {number} delay The delay in milliseconds (default: 500ms)
 * @returns {[T, T | undefined]} A tuple containing the debounced value and the previous debounced value
 * 
 * @example
 * const [text, setText] = useState('');
 * const [debouncedText, previousDebouncedText] = useDebouncedWithPrevious(text, 300);
 * 
 * // You can see both current and previous values
 * console.log('Current:', debouncedText, 'Previous:', previousDebouncedText);
 */
export function useDebouncedWithPrevious<T>(value: T, delay = 500): [T, T | undefined] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [previousValue, setPreviousValue] = useState<T | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setPreviousValue(debouncedValue);
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay, debouncedValue]);
  
  return [debouncedValue, previousValue];
}