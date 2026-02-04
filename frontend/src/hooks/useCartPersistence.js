/**
 * useCartPersistence - Hook para persistir el estado del carrito de alquiler
 * 
 * Guarda automáticamente en localStorage cuando el estado cambia y restaura
 * al montar el componente. Los datos solo se limpian cuando:
 * 1. Se completa la venta exitosamente
 * 2. El usuario pulsa "Vaciar Carrito" o "Cancelar"
 * 3. El usuario cierra sesión
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const CART_STORAGE_KEY = 'alpineflow_rental_cart';
const CART_VERSION = '1.0'; // Para invalidar datos antiguos si cambia la estructura

/**
 * Estructura de datos persistidos:
 * {
 *   version: string,
 *   timestamp: number,
 *   userId: string,
 *   data: {
 *     customer: object | null,
 *     items: array,
 *     detectedPacks: array,
 *     numDays: number,
 *     startDate: string,
 *     endDate: string,
 *     notes: string,
 *     discountType: string,
 *     discountValue: string,
 *     discountReason: string
 *   }
 * }
 */

// Función para obtener fecha inteligente
const getSmartStartDate = () => {
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 15) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  return now.toISOString().split('T')[0];
};

// Valores iniciales por defecto
const getDefaultState = () => ({
  customer: null,
  customerHistory: null,
  items: [],
  detectedPacks: [],
  numDays: 1,
  startDate: getSmartStartDate(),
  endDate: getSmartStartDate(),
  notes: '',
  discountType: 'none',
  discountValue: '',
  discountReason: ''
});

/**
 * Hook principal de persistencia
 */
export function useCartPersistence() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [cartState, setCartState] = useState(getDefaultState);
  const saveTimeoutRef = useRef(null);
  
  // Obtener el userId del token actual
  const getCurrentUserId = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.user_id || 'anonymous';
      }
    } catch (e) {
      // Token inválido o expirado
    }
    return 'anonymous';
  }, []);

  // Cargar estado desde localStorage
  const loadCart = useCallback(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      
      // Verificar versión
      if (parsed.version !== CART_VERSION) {
        console.log('[CartPersistence] Versión antigua detectada, limpiando...');
        localStorage.removeItem(CART_STORAGE_KEY);
        return null;
      }
      
      // Verificar que el userId coincide (prevención de colisiones)
      const currentUserId = getCurrentUserId();
      if (parsed.userId !== currentUserId) {
        console.log('[CartPersistence] UserId diferente, ignorando datos guardados');
        return null;
      }
      
      // Verificar que los datos no son muy antiguos (24 horas)
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas
      if (Date.now() - parsed.timestamp > maxAge) {
        console.log('[CartPersistence] Datos expirados (>24h), limpiando...');
        localStorage.removeItem(CART_STORAGE_KEY);
        return null;
      }
      
      console.log('[CartPersistence] Estado restaurado:', {
        customer: parsed.data.customer?.name,
        items: parsed.data.items?.length,
        detectedPacks: parsed.data.detectedPacks?.length
      });
      
      return parsed.data;
    } catch (e) {
      console.error('[CartPersistence] Error al cargar:', e);
      localStorage.removeItem(CART_STORAGE_KEY);
      return null;
    }
  }, [getCurrentUserId]);

  // Guardar estado en localStorage (con debounce)
  const saveCart = useCallback((data) => {
    // Cancelar guardado pendiente
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce de 500ms para evitar guardados excesivos
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const toSave = {
          version: CART_VERSION,
          timestamp: Date.now(),
          userId: getCurrentUserId(),
          data: {
            customer: data.customer,
            customerHistory: data.customerHistory,
            items: data.items,
            detectedPacks: data.detectedPacks,
            numDays: data.numDays,
            startDate: data.startDate,
            endDate: data.endDate,
            notes: data.notes,
            discountType: data.discountType,
            discountValue: data.discountValue,
            discountReason: data.discountReason
          }
        };
        
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(toSave));
        
        // Log solo si hay datos significativos
        if (data.items?.length > 0 || data.customer) {
          console.log('[CartPersistence] Estado guardado:', {
            customer: data.customer?.name,
            items: data.items?.length
          });
        }
      } catch (e) {
        console.error('[CartPersistence] Error al guardar:', e);
      }
    }, 500);
  }, [getCurrentUserId]);

  // Limpiar carrito (llamar al completar venta o cancelar)
  const clearCart = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    localStorage.removeItem(CART_STORAGE_KEY);
    setCartState(getDefaultState());
    console.log('[CartPersistence] Carrito limpiado');
  }, []);

  // Inicialización: cargar datos guardados
  useEffect(() => {
    const savedData = loadCart();
    if (savedData) {
      setCartState(savedData);
    }
    setIsInitialized(true);
  }, [loadCart]);

  // Guardar cuando cambia el estado (después de inicialización)
  useEffect(() => {
    if (isInitialized) {
      saveCart(cartState);
    }
  }, [cartState, isInitialized, saveCart]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Métodos de actualización
  const updateCart = useCallback((updates) => {
    setCartState(prev => ({ ...prev, ...updates }));
  }, []);

  const setCustomer = useCallback((customer) => {
    setCartState(prev => ({ ...prev, customer }));
  }, []);

  const setCustomerHistory = useCallback((customerHistory) => {
    setCartState(prev => ({ ...prev, customerHistory }));
  }, []);

  const setItems = useCallback((itemsOrUpdater) => {
    setCartState(prev => ({
      ...prev,
      items: typeof itemsOrUpdater === 'function' 
        ? itemsOrUpdater(prev.items) 
        : itemsOrUpdater
    }));
  }, []);

  const setDetectedPacks = useCallback((packsOrUpdater) => {
    setCartState(prev => ({
      ...prev,
      detectedPacks: typeof packsOrUpdater === 'function'
        ? packsOrUpdater(prev.detectedPacks)
        : packsOrUpdater
    }));
  }, []);

  const setNumDays = useCallback((days) => {
    setCartState(prev => ({ ...prev, numDays: days }));
  }, []);

  const setStartDate = useCallback((date) => {
    setCartState(prev => ({ ...prev, startDate: date }));
  }, []);

  const setEndDate = useCallback((date) => {
    setCartState(prev => ({ ...prev, endDate: date }));
  }, []);

  const setNotes = useCallback((notes) => {
    setCartState(prev => ({ ...prev, notes }));
  }, []);

  const setDiscountType = useCallback((type) => {
    setCartState(prev => ({ ...prev, discountType: type }));
  }, []);

  const setDiscountValue = useCallback((value) => {
    setCartState(prev => ({ ...prev, discountValue: value }));
  }, []);

  const setDiscountReason = useCallback((reason) => {
    setCartState(prev => ({ ...prev, discountReason: reason }));
  }, []);

  return {
    // Estado
    isInitialized,
    customer: cartState.customer,
    customerHistory: cartState.customerHistory,
    items: cartState.items,
    detectedPacks: cartState.detectedPacks,
    numDays: cartState.numDays,
    startDate: cartState.startDate,
    endDate: cartState.endDate,
    notes: cartState.notes,
    discountType: cartState.discountType,
    discountValue: cartState.discountValue,
    discountReason: cartState.discountReason,
    
    // Métodos de actualización
    setCustomer,
    setCustomerHistory,
    setItems,
    setDetectedPacks,
    setNumDays,
    setStartDate,
    setEndDate,
    setNotes,
    setDiscountType,
    setDiscountValue,
    setDiscountReason,
    updateCart,
    
    // Métodos de control
    clearCart,
    
    // Verificación de contenido
    hasCartData: cartState.items.length > 0 || cartState.customer !== null
  };
}

/**
 * Función utilitaria para limpiar el carrito desde cualquier componente
 * (por ejemplo, al cerrar sesión)
 */
export function clearPersistedCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
  console.log('[CartPersistence] Carrito persistido eliminado');
}

export default useCartPersistence;
