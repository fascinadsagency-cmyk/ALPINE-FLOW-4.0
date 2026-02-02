import React, { useEffect, useRef, useCallback } from 'react';

/**
 * ============================================================================
 * COMPONENTE: FocusTrap
 * ============================================================================
 * 
 * Envuelve contenido para atrapar el foco dentro de él.
 * Ideal para modales, dialogs y formularios.
 * 
 * Props:
 * - active: boolean - Si el trap está activo
 * - onEscape: function - Callback al presionar Escape
 * - autoFocus: boolean - Enfocar automáticamente el primer elemento
 * - returnFocus: boolean - Devolver el foco al elemento anterior al cerrar
 * - initialFocus: React.Ref - Referencia al elemento que debe recibir el foco inicial
 * 
 * USO:
 *   <Dialog open={open}>
 *     <FocusTrap active={open} onEscape={() => setOpen(false)}>
 *       <DialogContent>
 *         <input autoFocus />
 *         <button>Cerrar</button>
 *       </DialogContent>
 *     </FocusTrap>
 *   </Dialog>
 */

const FOCUSABLE_SELECTOR = [
  'a[href]:not([disabled]):not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"]):not([type="hidden"])',
  'select:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
  '[contenteditable="true"]:not([tabindex="-1"])'
].join(',');

export function FocusTrap({
  children,
  active = true,
  onEscape,
  autoFocus = true,
  returnFocus = true,
  initialFocus = null,
  className = '',
  ...props
}) {
  const containerRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  // Obtener elementos focusables visibles
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll(FOCUSABLE_SELECTOR))
      .filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               el.offsetParent !== null;
      });
  }, []);

  // Manejador de teclas
  const handleKeyDown = useCallback((e) => {
    if (!active) return;

    // Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (onEscape) onEscape();
      return;
    }

    // Tab
    if (e.key === 'Tab') {
      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab en el primer elemento
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
        return;
      }

      // Tab en el último elemento
      if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
        return;
      }

      // Si el foco está fuera del contenedor, traerlo de vuelta
      if (!containerRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [active, onEscape, getFocusableElements]);

  // Guardar referencia al elemento activo y enfocar al activar
  useEffect(() => {
    if (!active) return;

    // Guardar el elemento actualmente enfocado
    previouslyFocusedRef.current = document.activeElement;

    // Enfocar el elemento inicial
    const focusInitial = () => {
      if (initialFocus?.current) {
        initialFocus.current.focus();
      } else if (autoFocus) {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    };

    const timer = setTimeout(focusInitial, 50);

    return () => {
      clearTimeout(timer);
      // Devolver el foco
      if (returnFocus && previouslyFocusedRef.current) {
        try {
          previouslyFocusedRef.current.focus();
        } catch (e) {
          // El elemento puede haber sido eliminado
        }
      }
    };
  }, [active, autoFocus, returnFocus, getFocusableElements, initialFocus]);

  // Añadir/remover listener
  useEffect(() => {
    if (!active) return;
    
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [active, handleKeyDown]);

  return (
    <div 
      ref={containerRef} 
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * ============================================================================
 * COMPONENTE: FormFieldWrapper
 * ============================================================================
 * 
 * Envuelve un campo de formulario con soporte para navegación por teclado
 * y tabindex optimizado.
 */
export function FormFieldWrapper({
  children,
  tabIndex = 0,
  onNext,
  onPrevious,
  skipTab = false,
  className = ''
}) {
  const handleKeyDown = (e) => {
    if (skipTab) return;

    if (e.key === 'Tab') {
      if (e.shiftKey && onPrevious) {
        e.preventDefault();
        onPrevious();
      } else if (!e.shiftKey && onNext) {
        e.preventDefault();
        onNext();
      }
    }
  };

  return (
    <div 
      className={className}
      onKeyDown={handleKeyDown}
      tabIndex={skipTab ? -1 : tabIndex}
    >
      {children}
    </div>
  );
}

export default FocusTrap;
