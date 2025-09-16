import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSmartScrollProps {
  containerSelector?: string;
  threshold?: number;
  debounceMs?: number;
}

export function useSmartScroll({
  containerSelector = '#chat-container',
  threshold = 100,
  debounceMs = 150
}: UseSmartScrollProps = {}) {
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const observerRef = useRef<MutationObserver>();
  const lastScrollTop = useRef(0);
  const autoScrollActive = useRef(false);

  // Debounced scroll position check
  const checkScrollPosition = useCallback(() => {
    const container = document.querySelector(containerSelector) as HTMLElement;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold;
    
    // Only update if user manually scrolled (not during auto-scroll)
    if (!autoScrollActive.current) {
      setUserScrolledUp(!isAtBottom);
    }
    
    lastScrollTop.current = scrollTop;
  }, [containerSelector, threshold]);

  // Smooth scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = document.querySelector(containerSelector) as HTMLElement;
    if (!container) return;

    autoScrollActive.current = true;
    setIsAutoScrolling(true);
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior
    });

    // Reset auto-scroll flag after animation
    setTimeout(() => {
      autoScrollActive.current = false;
      setIsAutoScrolling(false);
      checkScrollPosition();
    }, behavior === 'smooth' ? 300 : 0);
  }, [containerSelector, checkScrollPosition]);

  // Handle user scroll events
  const handleUserScroll = useCallback((event: Event) => {
    const container = event.target as HTMLElement;
    const { scrollTop } = container;

    // Detect scroll direction
    if (scrollTop < lastScrollTop.current) {
      // User is scrolling up - immediately stop auto-scroll
      setUserScrolledUp(true);
      autoScrollActive.current = false;
    }

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Store current scroll position
    lastScrollTop.current = scrollTop;

    // Debounce scroll position check
    scrollTimeoutRef.current = setTimeout(checkScrollPosition, debounceMs);
  }, [checkScrollPosition, debounceMs]);

  // Set up scroll listener
  useEffect(() => {
    const container = document.querySelector(containerSelector) as HTMLElement;
    if (!container) return;

    container.addEventListener('scroll', handleUserScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleUserScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [containerSelector, handleUserScroll]);

  // Set up content change observer for auto-scroll
  useEffect(() => {
    const container = document.querySelector(containerSelector) as HTMLElement;
    if (!container) return;

    // Create observer for content changes
    observerRef.current = new MutationObserver((mutations) => {
      let shouldAutoScroll = false;
      
      mutations.forEach((mutation) => {
        // Check if content was added/modified
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldAutoScroll = true;
        }
        
        // Check for text content changes (typing animation)
        if (mutation.type === 'characterData') {
          shouldAutoScroll = true;
        }
        
        // Check for attribute changes that might affect height
        if (mutation.type === 'attributes' && 
            ['style', 'class'].includes(mutation.attributeName || '')) {
          shouldAutoScroll = true;
        }
      });

      // Only auto-scroll if user hasn't manually scrolled up
      if (shouldAutoScroll && !userScrolledUp) {
        const container = document.querySelector(containerSelector) as HTMLElement;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < threshold * 2;

        // Only auto-scroll if we're already near the bottom
        if (isNearBottom) {
          requestAnimationFrame(() => {
            scrollToBottom('auto'); // Use 'auto' for performance during typing
          });
        }
      }
    });

    // Start observing
    observerRef.current.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [containerSelector, userScrolledUp, scrollToBottom]);

  // Manual scroll to bottom (for button clicks)
  const scrollToBottomManual = useCallback(() => {
    setUserScrolledUp(false);
    scrollToBottom('smooth');
  }, [scrollToBottom]);

  // Reset scroll state (useful when clearing chat)
  const resetScrollState = useCallback(() => {
    setUserScrolledUp(false);
    autoScrollActive.current = false;
    setIsAutoScrolling(false);
  }, []);

  return {
    userScrolledUp,
    isAutoScrolling,
    scrollToBottom: scrollToBottomManual,
    resetScrollState,
    setUserScrolledUp
  };
}