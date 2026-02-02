import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * HOOK: useScannerListener
 * 
 * Sistema de Captura Global para lectores de códigos de barras HID (como Netum NT-1698W).
 * 
 * Características:
 * - Escucha global de teclas (window.addEventListener)
 * - Detección automática de entrada de escáner vs humano (por velocidad de tecleo)
 * - Auto-foco permanente en campo designado
 * - Buffer de acumulación de caracteres
 * - Limpieza automática al recibir Enter
 * - Prevención de acciones no deseadas (cierre de modales, submit de formularios)
 * 
 * @param {Object} options - Opciones de configuración
 * @param {Function} options.onScan - Callback cuando se detecta un escaneo completo (recibe el código)
 * @param {React.RefObject} options.inputRef - Ref del campo de entrada principal
 * @param {boolean} options.enabled - Si el listener está activo (default: true)
 * @param {number} options.minLength - Longitud mínima del código (default: 3)
 * @param {number} options.maxTimeBetweenKeys - Tiempo máximo entre teclas para considerar escáner (default: 50ms)
 * @param {number} options.scannerDetectionThreshold - Caracteres mínimos para confirmar escáner (default: 6)
 * @param {boolean} options.autoFocus - Si debe auto-enfocar el input (default: true)
 * @param {Array} options.allowedPrefixes - Prefijos permitidos (opcional, para filtrar códigos)
 */
export function useScannerListener({
  onScan,
  inputRef,
  enabled = true,
  minLength = 3,
  maxTimeBetweenKeys = 50,
  scannerDetectionThreshold = 6,
  autoFocus = true,
  allowedPrefixes = null,
} = {}) {
  // Buffer para acumular caracteres
  const bufferRef = useRef('');
  // Timestamp de la última tecla
  const lastKeyTimeRef = useRef(0);
  // Contador de teclas rápidas consecutivas
  const fastKeyCountRef = useRef(0);
  // Flag para saber si estamos en modo "escáner detectado"
  const scannerModeRef = useRef(false);
  // Timer para limpiar buffer si no hay actividad
  const clearTimerRef = useRef(null);
  
  // Estado para mostrar feedback visual
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');

  // Limpiar el buffer
  const clearBuffer = useCallback(() => {
    bufferRef.current = '';
    fastKeyCountRef.current = 0;
    scannerModeRef.current = false;
    setIsScanning(false);
  }, []);

  // Procesar el código escaneado
  const processCode = useCallback((code) => {
    const trimmedCode = code.trim();
    
    // Validar longitud mínima
    if (trimmedCode.length < minLength) {
      clearBuffer();
      return;
    }

    // Validar prefijos si están configurados
    if (allowedPrefixes && allowedPrefixes.length > 0) {
      const hasValidPrefix = allowedPrefixes.some(prefix => 
        trimmedCode.toUpperCase().startsWith(prefix.toUpperCase())
      );
      if (!hasValidPrefix) {
        clearBuffer();
        return;
      }
    }

    // Ejecutar callback con el código
    setLastScannedCode(trimmedCode);
    if (onScan) {
      onScan(trimmedCode);
    }

    // Limpiar después de procesar
    clearBuffer();
    
    // Limpiar el input si existe
    if (inputRef?.current) {
      inputRef.current.value = '';
    }
  }, [onScan, inputRef, minLength, allowedPrefixes, clearBuffer]);

  // Verificar si el elemento activo es un campo de texto
  const isInputFocused = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    const tagName = activeElement.tagName.toLowerCase();
    const isInput = tagName === 'input' || tagName === 'textarea';
    const isContentEditable = activeElement.contentEditable === 'true';
    
    // Excluir inputs de tipo button, submit, etc.
    if (isInput && activeElement.type) {
      const nonTextTypes = ['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image'];
      if (nonTextTypes.includes(activeElement.type)) {
        return false;
      }
    }
    
    return isInput || isContentEditable;
  }, []);

  // Manejador principal de teclas
  const handleKeyDown = useCallback((e) => {
    if (!enabled) return;

    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    // Cancelar timer de limpieza anterior
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }

    // Programar limpieza de buffer si no hay actividad en 500ms
    clearTimerRef.current = setTimeout(() => {
      if (bufferRef.current.length > 0 && !scannerModeRef.current) {
        clearBuffer();
      }
    }, 500);

    // === MANEJO DE ENTER ===
    if (e.key === 'Enter') {
      if (bufferRef.current.length >= minLength) {
        // Prevenir acciones por defecto (submit de formularios, cierre de modales)
        e.preventDefault();
        e.stopPropagation();
        
        processCode(bufferRef.current);
        return;
      } else if (scannerModeRef.current) {
        // Si estábamos en modo escáner pero el código es muy corto, limpiar
        e.preventDefault();
        clearBuffer();
        return;
      }
      // Si no hay nada en el buffer, dejar que Enter funcione normal
      return;
    }

    // === MANEJO DE ESCAPE ===
    if (e.key === 'Escape') {
      clearBuffer();
      return;
    }

    // === ACUMULACIÓN DE CARACTERES ===
    // Solo acumular caracteres alfanuméricos y algunos especiales comunes en códigos
    const isValidChar = /^[a-zA-Z0-9\-_.]$/.test(e.key);
    
    if (!isValidChar) {
      return;
    }

    // Detectar entrada rápida (característica de escáneres)
    if (timeSinceLastKey < maxTimeBetweenKeys) {
      fastKeyCountRef.current++;
      
      // Si detectamos muchas teclas rápidas, confirmamos que es un escáner
      if (fastKeyCountRef.current >= scannerDetectionThreshold) {
        scannerModeRef.current = true;
        setIsScanning(true);
      }
    } else {
      // Si pasó mucho tiempo, reiniciar contador de teclas rápidas
      // pero mantener el buffer si ya estamos en modo escáner
      if (!scannerModeRef.current) {
        fastKeyCountRef.current = 1;
      }
    }

    // Si el cursor NO está en un campo de texto, capturar globalmente
    if (!isInputFocused()) {
      // Prevenir que el carácter se escriba en otro lugar
      e.preventDefault();
      
      // Acumular en el buffer
      bufferRef.current += e.key;
      
      // Si tenemos un inputRef y autoFocus está activo, escribir ahí también
      if (inputRef?.current && autoFocus) {
        inputRef.current.value = bufferRef.current;
        inputRef.current.focus();
      }
    } else {
      // El cursor está en un input, acumular normalmente
      bufferRef.current += e.key;
    }
  }, [
    enabled, 
    minLength, 
    maxTimeBetweenKeys, 
    scannerDetectionThreshold, 
    autoFocus,
    inputRef, 
    processCode, 
    clearBuffer, 
    isInputFocused
  ]);

  // Auto-foco cuando se hace clic en el fondo
  const handleDocumentClick = useCallback((e) => {
    if (!enabled || !autoFocus || !inputRef?.current) return;

    // Lista de elementos que NO deben causar re-foco
    const clickedElement = e.target;
    const tagName = clickedElement.tagName.toLowerCase();
    
    // No re-enfocar si se hizo clic en un elemento interactivo
    const interactiveElements = ['button', 'a', 'input', 'textarea', 'select', 'label'];
    if (interactiveElements.includes(tagName)) return;
    
    // No re-enfocar si el elemento tiene role de botón o es parte de un componente interactivo
    if (clickedElement.getAttribute('role') === 'button' ||
        clickedElement.getAttribute('role') === 'option' ||
        clickedElement.getAttribute('role') === 'menuitem') return;
    
    // No re-enfocar si está dentro de un modal de selección o dropdown
    if (clickedElement.closest('[role="dialog"]') ||
        clickedElement.closest('[role="listbox"]') ||
        clickedElement.closest('[role="menu"]')) return;

    // Re-enfocar en el campo de código de barras
    setTimeout(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    }, 10);
  }, [enabled, autoFocus, inputRef]);

  // Configurar listeners
  useEffect(() => {
    if (!enabled) return;

    // Listener global de teclas - usando capture para interceptar antes que otros handlers
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    
    // Listener de clics para auto-foco
    if (autoFocus) {
      document.addEventListener('click', handleDocumentClick, { capture: false });
    }

    // Limpieza
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('click', handleDocumentClick, { capture: false });
      
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    };
  }, [enabled, handleKeyDown, handleDocumentClick, autoFocus]);

  // Auto-foco inicial
  useEffect(() => {
    if (enabled && autoFocus && inputRef?.current) {
      // Pequeño delay para asegurar que el componente está montado
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [enabled, autoFocus, inputRef]);

  // Función para forzar el foco manualmente
  const forceFocus = useCallback(() => {
    if (inputRef?.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [inputRef]);

  // Función para simular un escaneo (útil para testing)
  const simulateScan = useCallback((code) => {
    processCode(code);
  }, [processCode]);

  return {
    isScanning,
    lastScannedCode,
    clearBuffer,
    forceFocus,
    simulateScan,
    bufferLength: bufferRef.current.length,
  };
}

export default useScannerListener;
