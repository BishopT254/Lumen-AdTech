import { useEffect, RefObject } from "react";

/**
 * Hook that calls a callback when a click occurs outside of the specified element
 * @param ref Reference to the element to detect clicks outside of
 * @param callback Function to call when a click outside occurs
 */
export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  callback: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // If the ref doesn't exist or if the click was inside the element, do nothing
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      
      // Call the callback passing the event
      callback(event);
    };

    // Add event listeners for both mouse and touch events
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    // Clean up the event listeners when the component unmounts
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [ref, callback]);
}