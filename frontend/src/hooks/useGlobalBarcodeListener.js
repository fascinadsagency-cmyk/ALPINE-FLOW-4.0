import { useEffect, useRef, useCallback } from 'react';

/**
 * Global Barcode Listener Hook
 * 
 * Detects barcode scanner input (keyboard wedge) without requiring focus on any input.
 * Barcode scanners "type" characters very fast (10+ chars in <50ms) and end with Enter.
 * 
 * @param {Function} onScan - Callback called with the scanned barcode string
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether the listener is active (default: true)
 * @param {number} options.minLength - Minimum barcode length to accept (default: 3)
 * @param {number} options.maxLength - Maximum barcode length (default: 50)
 * @param {number} options.timeoutMs - Time without input before buffer clears (default: 100ms)
 * @param {number} options.minCharsForScan - Minimum chars to consider it a scan (default: 4)
 * @param {string[]} options.excludeInputTypes - Input types to ignore when focused (default: ['text', 'search', 'number', 'tel', 'password'])
 */
export function useGlobalBarcodeListener(onScan, options = {}) {
  const {
    enabled = true,
    minLength = 3,
    maxLength = 50,
    timeoutMs = 100,
    minCharsForScan = 4,
    excludeInputTypes = ['text', 'search', 'number', 'tel', 'password', 'email']
  } = options;

  // Refs for state that shouldn't trigger re-renders
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const timeoutIdRef = useRef(null);
  const keyTimestampsRef = useRef([]);

  // Clear the buffer
  const clearBuffer = useCallback(() => {
    bufferRef.current = '';
    keyTimestampsRef.current = [];
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  // Check if current focus should block barcode capture
  const shouldBlockCapture = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    const inputType = activeElement.type?.toLowerCase();

    // Block if focused on textarea
    if (tagName === 'textarea') return true;

    // Block if focused on contenteditable
    if (activeElement.contentEditable === 'true') return true;

    // Block if focused on input of certain types
    if (tagName === 'input' && excludeInputTypes.includes(inputType)) {
      return true;
    }

    return false;
  }, [excludeInputTypes]);

  // Calculate typing speed (chars per second)
  const calculateTypingSpeed = useCallback(() => {
    const timestamps = keyTimestampsRef.current;
    if (timestamps.length < 2) return 0;

    const firstTime = timestamps[0];
    const lastTime = timestamps[timestamps.length - 1];
    const duration = lastTime - firstTime;

    if (duration === 0) return Infinity; // All keys at same time = very fast
    
    // Return chars per second
    return (timestamps.length / duration) * 1000;
  }, []);

  // Process the buffer as a barcode scan
  const processScan = useCallback(() => {
    const barcode = bufferRef.current.trim();
    
    // Validate barcode
    if (barcode.length < minLength || barcode.length > maxLength) {
      clearBuffer();
      return;
    }

    // Check typing speed - scanners are VERY fast (>50 chars/sec typically)
    const charsPerSecond = calculateTypingSpeed();
    const isFastEnough = charsPerSecond > 30; // 30+ chars/sec is definitely a scanner

    // Also check if we have minimum chars (short barcodes might be typed fast by humans)
    const hasEnoughChars = barcode.length >= minCharsForScan;

    if (isFastEnough && hasEnoughChars) {
      console.log(`[BarcodeListener] Scan detected: "${barcode}" (${charsPerSecond.toFixed(0)} chars/sec)`);
      onScan(barcode);
    } else {
      console.log(`[BarcodeListener] Rejected: "${barcode}" (${charsPerSecond.toFixed(0)} chars/sec, len=${barcode.length})`);
    }

    clearBuffer();
  }, [onScan, minLength, maxLength, minCharsForScan, calculateTypingSpeed, clearBuffer]);

  // Handle keydown events
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    // Don't capture if focused on text input
    if (shouldBlockCapture()) return;

    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    // If too much time passed, clear buffer (human typing is slower)
    if (timeSinceLastKey > timeoutMs && bufferRef.current.length > 0) {
      clearBuffer();
    }

    // Handle Enter key - process the scan
    if (event.key === 'Enter') {
      if (bufferRef.current.length >= minLength) {
        event.preventDefault();
        event.stopPropagation();
        processScan();
      } else {
        clearBuffer();
      }
      return;
    }

    // Handle Escape - clear buffer
    if (event.key === 'Escape') {
      clearBuffer();
      return;
    }

    // Only capture printable characters
    if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      // Add to buffer
      bufferRef.current += event.key;
      keyTimestampsRef.current.push(now);

      // Prevent default only if we're building a barcode
      if (bufferRef.current.length >= 2) {
        // Don't prevent if it looks like human typing (slow)
        const avgTimeBetweenKeys = timeSinceLastKey;
        if (avgTimeBetweenKeys < 50) { // Fast typing = scanner
          event.preventDefault();
        }
      }

      // Set timeout to clear buffer if no more input
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      timeoutIdRef.current = setTimeout(() => {
        if (bufferRef.current.length > 0) {
          console.log(`[BarcodeListener] Timeout - clearing buffer: "${bufferRef.current}"`);
          clearBuffer();
        }
      }, timeoutMs);

      // Safety: don't let buffer grow too large
      if (bufferRef.current.length > maxLength) {
        clearBuffer();
      }
    }
  }, [enabled, shouldBlockCapture, timeoutMs, minLength, maxLength, processScan, clearBuffer]);

  // Set up the global listener
  useEffect(() => {
    if (!enabled) return;

    // Use capture phase to intercept before other handlers
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [enabled, handleKeyDown]);

  // Return control functions
  return {
    clearBuffer,
    isEnabled: enabled
  };
}

export default useGlobalBarcodeListener;
