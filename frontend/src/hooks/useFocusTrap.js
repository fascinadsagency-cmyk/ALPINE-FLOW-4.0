import { useEffect, useRef, useCallback } from 'react';

/**
 * ============================================================================
 * HOOK: useFocusTrap
 * ============================================================================
 * 
 * Atrapa el foco dentro de un contenedor (modal, dialog, etc.) para garantizar
 * una navegación por teclado profesional y accesible.
 * 
 * Características:
 * - El Tab cicla solo entre elementos focusables dentro del contenedor
 * - Shift+Tab navega hacia atrás
 * - Escape cierra el contenedor y devuelve el foco al elemento que lo abrió
 * - Auto-foco en el primer elemento al abrir
 * 
 * USO:
 *   const { containerRef, firstFocusableRef, lastFocusableRef } = useFocusTrap({
 *     isActive: isModalOpen,
 *     onEscape: () => setIsModalOpen(false),
 *     returnFocusOnClose: true
 *   });
 *   
 *   return (
 *     <div ref={containerRef}>
 *       <input ref={firstFocusableRef} />
 *       ...
 *       <button ref={lastFocusableRef}>Cerrar</button>
 *     </div>
 *   );
 */

// Selector para elementos focusables
const FOCUSABLE_SELECTOR = [
  'a[href]:not([disabled]):not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"]):not([type="hidden"])',
  'select:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
  '[contenteditable="true"]:not([tabindex="-1"])'
].join(',');

export function useFocusTrap({
  isActive = true,
  onEscape,
  returnFocusOnClose = true,
  autoFocusFirst = true,
  initialFocusRef = null
} = {}) {
  const containerRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);

  // Obtener todos los elementos focusables dentro del contenedor
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll(FOCUSABLE_SELECTOR))
      .filter(el => {
        // Filtrar elementos ocultos o con display:none
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               el.offsetParent !== null;
      });
  }, []);

  // Manejador de teclas
  const handleKeyDown = useCallback((e) => {
    if (!isActive || !containerRef.current) return;

    // Escape - cerrar modal
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (onEscape) {
        onEscape();
      }
      return;
    }

    // Tab - navegar dentro del contenedor
    if (e.key === 'Tab') {
      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab en el primer elemento -> ir al último
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
        return;
      }

      // Tab en el último elemento -> ir al primero
      if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
        return;
      }

      // Verificar que el foco está dentro del contenedor
      if (!containerRef.current.contains(document.activeElement)) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [isActive, onEscape, getFocusableElements]);

  // Efecto para activar/desactivar el trap
  useEffect(() => {
    if (!isActive) return;

    // Guardar el elemento actualmente enfocado
    previouslyFocusedRef.current = document.activeElement;

    // Enfocar el primer elemento o el especificado
    const focusInitial = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (autoFocusFirst) {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    };

    // Pequeño delay para asegurar que el DOM está listo
    const timer = setTimeout(focusInitial, 50);

    // Añadir listener de teclado
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown, true);
      
      // Devolver el foco al elemento anterior
      if (returnFocusOnClose && previouslyFocusedRef.current) {
        try {
          previouslyFocusedRef.current.focus();
        } catch (e) {
          // El elemento puede haber sido eliminado
        }
      }
    };
  }, [isActive, autoFocusFirst, returnFocusOnClose, handleKeyDown, getFocusableElements, initialFocusRef]);

  return {
    containerRef,
    firstFocusableRef,
    lastFocusableRef,
    getFocusableElements
  };
}

/**
 * ============================================================================
 * HOOK: useTabSequence
 * ============================================================================
 * 
 * Define una secuencia de tabulación lógica para formularios.
 * Permite saltar entre campos en un orden específico, ignorando la navegación
 * del sidebar y otros elementos decorativos.
 * 
 * USO:
 *   const { registerField, handleTabNavigation } = useTabSequence([
 *     'barcode',
 *     'customer',
 *     'days',
 *     'price',
 *     'submit'
 *   ]);
 *   
 *   <input 
 *     ref={registerField('barcode')}
 *     onKeyDown={handleTabNavigation}
 *   />
 */
export function useTabSequence(fieldOrder = []) {
  const fieldsRef = useRef({});

  const registerField = useCallback((fieldName) => {
    return (element) => {
      fieldsRef.current[fieldName] = element;
    };
  }, []);

  const focusField = useCallback((fieldName) => {
    const field = fieldsRef.current[fieldName];
    if (field) {
      field.focus();
      // Si es un input, seleccionar el contenido
      if (field.select) {
        field.select();
      }
    }
  }, []);

  const focusNext = useCallback((currentFieldName) => {
    const currentIndex = fieldOrder.indexOf(currentFieldName);
    if (currentIndex === -1 || currentIndex >= fieldOrder.length - 1) return;
    
    const nextField = fieldOrder[currentIndex + 1];
    focusField(nextField);
  }, [fieldOrder, focusField]);

  const focusPrevious = useCallback((currentFieldName) => {
    const currentIndex = fieldOrder.indexOf(currentFieldName);
    if (currentIndex <= 0) return;
    
    const prevField = fieldOrder[currentIndex - 1];
    focusField(prevField);
  }, [fieldOrder, focusField]);

  const handleTabNavigation = useCallback((e, currentFieldName) => {
    if (e.key !== 'Tab') return;

    const currentIndex = fieldOrder.indexOf(currentFieldName);
    if (currentIndex === -1) return;

    e.preventDefault();

    if (e.shiftKey) {
      focusPrevious(currentFieldName);
    } else {
      focusNext(currentFieldName);
    }
  }, [fieldOrder, focusNext, focusPrevious]);

  const focusFirst = useCallback(() => {
    if (fieldOrder.length > 0) {
      focusField(fieldOrder[0]);
    }
  }, [fieldOrder, focusField]);

  const focusLast = useCallback(() => {
    if (fieldOrder.length > 0) {
      focusField(fieldOrder[fieldOrder.length - 1]);
    }
  }, [fieldOrder, focusField]);

  return {
    registerField,
    focusField,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    handleTabNavigation
  };
}

/**
 * ============================================================================
 * HOOK: useFormKeyboardNav
 * ============================================================================
 * 
 * Navegación por teclado para formularios con soporte completo para:
 * - Tab/Shift+Tab para navegar
 * - Enter para avanzar al siguiente campo o enviar
 * - Escape para cancelar/cerrar
 * - Integración con lectores de códigos de barras
 */
export function useFormKeyboardNav({
  onSubmit,
  onCancel,
  fieldRefs = {},
  submitOnEnter = false,
  quickScanMode = false
} = {}) {
  
  const handleKeyDown = useCallback((e, fieldName) => {
    // Enter - siguiente campo o enviar
    if (e.key === 'Enter' && !e.shiftKey) {
      // En modo scan rápido, no avanzar (el handler del scanner se encarga)
      if (quickScanMode && fieldName === 'barcode') {
        return;
      }
      
      // Si es el último campo o submitOnEnter está activo, enviar
      if (submitOnEnter && onSubmit) {
        e.preventDefault();
        onSubmit();
        return;
      }
    }

    // Escape - cancelar
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
    }
  }, [onSubmit, onCancel, submitOnEnter, quickScanMode]);

  return {
    handleKeyDown
  };
}

export default useFocusTrap;
