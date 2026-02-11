/**
 * ============================================================================
 * HOOK: useKeyboardNavigation
 * ============================================================================
 * 
 * Navegación completa por teclado estilo software de escritorio / spreadsheet
 * 
 * FUNCIONALIDADES:
 * - Arrow keys para navegar entre campos (respeta grid/tabla)
 * - Enter actúa como Tab (excepto en botones y textareas)
 * - Manejo inteligente del cursor en inputs de texto
 * - Navegación en tablas columna por columna
 * - Focus ring visual mejorado
 */

import { useCallback, useEffect, useRef } from 'react';

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Obtiene todos los elementos focusables dentro de un contenedor
 */
const getFocusableElements = (container = document) => {
  const selector = [
    'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])',
    'a[href]:not([disabled]):not([tabindex="-1"])'
  ].join(',');
  
  return Array.from(container.querySelectorAll(selector))
    .filter(el => {
      // Filtrar elementos no visibles
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             style.opacity !== '0' &&
             el.offsetParent !== null;
    });
};

/**
 * Obtiene la posición visual de un elemento
 */
const getElementPosition = (el) => {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    top: rect.top,
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
    width: rect.width,
    height: rect.height
  };
};

/**
 * Verifica si el cursor está al inicio/final de un input de texto
 */
const getCursorPosition = (input) => {
  if (!input || !['text', 'email', 'tel', 'url', 'search', 'password', 'number'].includes(input.type)) {
    return { atStart: true, atEnd: true };
  }
  
  const { selectionStart, selectionEnd, value } = input;
  
  // Si hay selección de texto, no mover foco
  if (selectionStart !== selectionEnd) {
    return { atStart: false, atEnd: false, hasSelection: true };
  }
  
  return {
    atStart: selectionStart === 0,
    atEnd: selectionStart === value.length,
    hasSelection: false
  };
};

/**
 * Encuentra el mejor elemento en una dirección
 */
const findElementInDirection = (currentEl, direction, elements) => {
  const currentPos = getElementPosition(currentEl);
  let candidates = [];
  
  // Tolerancia para considerar elementos en la misma fila/columna
  const TOLERANCE = 20;
  
  elements.forEach(el => {
    if (el === currentEl) return;
    
    const pos = getElementPosition(el);
    let isCandidate = false;
    let distance = Infinity;
    
    switch (direction) {
      case 'up':
        // Elementos que están arriba
        if (pos.bottom < currentPos.top + TOLERANCE) {
          // Priorizar misma columna
          const horizontalDiff = Math.abs(pos.x - currentPos.x);
          const verticalDiff = currentPos.top - pos.bottom;
          distance = verticalDiff + (horizontalDiff * 0.5); // Penalizar cambio de columna
          isCandidate = true;
        }
        break;
        
      case 'down':
        // Elementos que están abajo
        if (pos.top > currentPos.bottom - TOLERANCE) {
          const horizontalDiff = Math.abs(pos.x - currentPos.x);
          const verticalDiff = pos.top - currentPos.bottom;
          distance = verticalDiff + (horizontalDiff * 0.5);
          isCandidate = true;
        }
        break;
        
      case 'left':
        // Elementos a la izquierda (en la misma fila visual)
        if (pos.right < currentPos.left + TOLERANCE) {
          const verticalDiff = Math.abs(pos.y - currentPos.y);
          // Solo considerar si está en la misma fila (±30px)
          if (verticalDiff < 50) {
            distance = currentPos.left - pos.right;
            isCandidate = true;
          }
        }
        break;
        
      case 'right':
        // Elementos a la derecha (en la misma fila visual)
        if (pos.left > currentPos.right - TOLERANCE) {
          const verticalDiff = Math.abs(pos.y - currentPos.y);
          if (verticalDiff < 50) {
            distance = pos.left - currentPos.right;
            isCandidate = true;
          }
        }
        break;
    }
    
    if (isCandidate) {
      candidates.push({ el, distance, pos });
    }
  });
  
  // Ordenar por distancia y devolver el más cercano
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0]?.el || null;
};

/**
 * Encuentra el siguiente/anterior elemento en orden de tab
 */
const findNextInTabOrder = (currentEl, direction, elements) => {
  const currentIndex = elements.indexOf(currentEl);
  if (currentIndex === -1) return elements[0];
  
  if (direction === 'next') {
    return elements[currentIndex + 1] || elements[0];
  } else {
    return elements[currentIndex - 1] || elements[elements.length - 1];
  }
};

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export function useKeyboardNavigation({
  containerRef = null,
  enabled = true,
  onNavigate = null,
  enterAsTab = true,
  arrowNavigation = true,
  gridMode = false, // Modo tabla/grid para navegación columna por columna
} = {}) {
  
  const lastFocusedRef = useRef(null);
  
  const handleKeyDown = useCallback((e) => {
    if (!enabled) return;
    
    const activeElement = document.activeElement;
    if (!activeElement) return;
    
    // ========== DETECTAR DROPDOWNS/LISTBOXES ABIERTOS ==========
    // No interferir si hay un menú desplegable abierto
    const openListbox = document.querySelector('[role="listbox"], [role="menu"], [data-radix-menu-content], [data-state="open"]');
    if (openListbox) {
      // Permitir navegación nativa dentro del dropdown
      return;
    }
    
    // Obtener contenedor de navegación
    const container = containerRef?.current || document.body;
    const focusableElements = getFocusableElements(container);
    
    if (focusableElements.length === 0) return;
    
    // ========== ENTER COMO TAB ==========
    if (e.key === 'Enter' && enterAsTab) {
      const tagName = activeElement.tagName.toLowerCase();
      const inputType = activeElement.type?.toLowerCase();
      
      // Excepciones: botones ejecutan acción, textarea hace salto de línea
      if (tagName === 'button' || inputType === 'submit') {
        return; // Dejar que el click se ejecute
      }
      
      if (tagName === 'textarea') {
        return; // Permitir salto de línea
      }
      
      // En select, Enter abre el dropdown - permitirlo
      if (tagName === 'select') {
        return;
      }
      
      // Para inputs, actuar como Tab
      e.preventDefault();
      const nextEl = findNextInTabOrder(activeElement, 'next', focusableElements);
      if (nextEl) {
        nextEl.focus();
        // Si es un input, seleccionar todo el contenido
        if (nextEl.tagName.toLowerCase() === 'input' && nextEl.select) {
          setTimeout(() => nextEl.select(), 0);
        }
        onNavigate?.('enter', nextEl);
      }
      return;
    }
    
    // ========== NAVEGACIÓN CON FLECHAS ==========
    if (arrowNavigation && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const tagName = activeElement.tagName.toLowerCase();
      const inputType = activeElement.type?.toLowerCase();
      
      // En textarea, permitir navegación normal
      if (tagName === 'textarea') {
        return;
      }
      
      // En select, up/down cambian la opción
      if (tagName === 'select' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        return;
      }
      
      // En inputs de texto, verificar posición del cursor
      if (tagName === 'input' && ['text', 'email', 'tel', 'url', 'search', 'password'].includes(inputType)) {
        const cursor = getCursorPosition(activeElement);
        
        // Si hay selección de texto, no mover foco
        if (cursor.hasSelection) {
          return;
        }
        
        // Izquierda: solo mover foco si cursor está al inicio
        if (e.key === 'ArrowLeft' && !cursor.atStart) {
          return;
        }
        
        // Derecha: solo mover foco si cursor está al final
        if (e.key === 'ArrowRight' && !cursor.atEnd) {
          return;
        }
      }
      
      // Mapear dirección
      const directionMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
      };
      
      const direction = directionMap[e.key];
      let targetEl = null;
      
      // Modo grid: navegación columna por columna
      if (gridMode) {
        targetEl = findElementInDirection(activeElement, direction, focusableElements);
      } else {
        // Modo normal: up/down buscan visualmente, left/right siguen orden tab
        if (direction === 'up' || direction === 'down') {
          targetEl = findElementInDirection(activeElement, direction, focusableElements);
        } else {
          targetEl = findNextInTabOrder(
            activeElement, 
            direction === 'right' ? 'next' : 'prev',
            focusableElements
          );
        }
      }
      
      if (targetEl) {
        e.preventDefault();
        targetEl.focus();
        
        // Seleccionar contenido si es input
        if (targetEl.tagName.toLowerCase() === 'input' && targetEl.select) {
          setTimeout(() => targetEl.select(), 0);
        }
        
        onNavigate?.(direction, targetEl);
      }
    }
    
  }, [enabled, containerRef, enterAsTab, arrowNavigation, gridMode, onNavigate]);
  
  // Registrar evento global
  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('keydown', handleKeyDown, { capture: false });
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: false });
    };
  }, [enabled, handleKeyDown]);
  
  return {
    handleKeyDown, // Para uso manual si es necesario
  };
}

// ============================================================================
// HOOK: useGridNavigation
// ============================================================================
/**
 * Hook especializado para navegación en tablas/grids
 * Permite navegar columna por columna con las flechas
 */
export function useGridNavigation({
  gridRef,
  enabled = true,
  columns = [], // Nombres/selectores de columnas para navegación precisa
  onCellChange = null,
} = {}) {
  
  const handleKeyDown = useCallback((e) => {
    if (!enabled || !gridRef?.current) return;
    
    const activeElement = document.activeElement;
    if (!activeElement) return;
    
    // Verificar que estamos dentro del grid
    if (!gridRef.current.contains(activeElement)) return;
    
    // Solo procesar flechas
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    
    // Obtener todos los elementos focusables del grid
    const focusableElements = getFocusableElements(gridRef.current);
    if (focusableElements.length === 0) return;
    
    // Verificar cursor en inputs de texto
    const tagName = activeElement.tagName.toLowerCase();
    const inputType = activeElement.type?.toLowerCase();
    
    if (tagName === 'input' && ['text', 'email', 'tel', 'url', 'search', 'password', 'number'].includes(inputType)) {
      const cursor = getCursorPosition(activeElement);
      
      if (e.key === 'ArrowLeft' && !cursor.atStart) return;
      if (e.key === 'ArrowRight' && !cursor.atEnd) return;
    }
    
    const direction = {
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right'
    }[e.key];
    
    const targetEl = findElementInDirection(activeElement, direction, focusableElements);
    
    if (targetEl) {
      e.preventDefault();
      e.stopPropagation();
      targetEl.focus();
      
      if (targetEl.tagName.toLowerCase() === 'input' && targetEl.select) {
        setTimeout(() => targetEl.select(), 0);
      }
      
      onCellChange?.(targetEl, direction);
    }
    
  }, [enabled, gridRef, onCellChange]);
  
  useEffect(() => {
    if (!enabled) return;
    
    const grid = gridRef?.current;
    if (!grid) return;
    
    grid.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      grid.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [enabled, gridRef, handleKeyDown]);
  
  return { handleKeyDown };
}

// ============================================================================
// CSS PARA FOCUS RING MEJORADO
// ============================================================================
export const focusRingStyles = `
  /* ========== FOCUS RING GLOBAL - NAVEGACIÓN POR TECLADO ========== */
  
  /* Reset focus por defecto */
  *:focus {
    outline: none;
  }
  
  /* Focus ring visible para navegación por teclado */
  input:focus,
  select:focus,
  textarea:focus,
  button:focus,
  [tabindex]:focus,
  a:focus {
    outline: 2px solid #0056b3 !important;
    outline-offset: 2px !important;
    box-shadow: 0 0 0 4px rgba(0, 86, 179, 0.15) !important;
  }
  
  /* Focus ring en modo oscuro */
  .dark input:focus,
  .dark select:focus,
  .dark textarea:focus,
  .dark button:focus,
  .dark [tabindex]:focus,
  .dark a:focus {
    outline: 2px solid #60a5fa !important;
    outline-offset: 2px !important;
    box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.2) !important;
  }
  
  /* Focus especial para elementos de tabla/grid */
  .keyboard-nav-grid input:focus,
  .keyboard-nav-grid select:focus {
    outline: 3px solid #0056b3 !important;
    outline-offset: 0px !important;
    background-color: #fffbeb !important;
  }
  
  .dark .keyboard-nav-grid input:focus,
  .dark .keyboard-nav-grid select:focus {
    outline: 3px solid #60a5fa !important;
    background-color: rgba(96, 165, 250, 0.1) !important;
  }
  
  /* Transición suave para focus */
  input, select, textarea, button, [tabindex], a {
    transition: outline 0.1s ease, box-shadow 0.1s ease;
  }
`;

export default useKeyboardNavigation;
