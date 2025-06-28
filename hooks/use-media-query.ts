import { useState, useEffect } from "react";

/**
 * Custom hook that returns true if the provided media query matches
 * @param query - CSS media query string (e.g. '(max-width: 768px)')
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with the current match state if in browser environment
  // or false for SSR compatibility
  const getMatches = (): boolean => {
    // Check if window is defined (browser environment)
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  // State to track if the media query matches
  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    // Early return if not in browser environment
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(query);
    
    // Set initial match state
    setMatches(mediaQuery.matches);

    // Define event listener
    const handleChange = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };

    // Modern approach using addEventListener
    mediaQuery.addEventListener("change", handleChange);

    // Clean up
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]); // Re-run effect if query changes

  return matches;
}