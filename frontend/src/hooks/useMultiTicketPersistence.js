/**
 * useMultiTicketPersistence - Hook para gestionar múltiples tickets de alquiler en paralelo
 * 
 * Similar a las cajas de supermercado, permite tener varios clientes/alquileres
 * en curso simultáneamente, cada uno con su propio estado aislado.
 * 
 * Funcionalidades:
 * - Crear/eliminar tickets
 * - Cambiar entre tickets
 * - Persistencia en localStorage
 * - Auto-renombrado de pestañas según cliente
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const TICKETS_STORAGE_KEY = 'alpineflow_multi_tickets';
const TICKETS_VERSION = '1.0';

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

// Estado inicial de un ticket vacío
const createEmptyTicket = (id) => ({
  id,
  createdAt: Date.now(),
  data: {
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
  }
});

// Generar ID único para ticket
const generateTicketId = () => `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Hook principal de gestión de múltiples tickets
 */
export function useMultiTicketPersistence() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(null);
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
  const loadTickets = useCallback(() => {
    try {
      const stored = localStorage.getItem(TICKETS_STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      // Verificar versión
      if (parsed.version !== TICKETS_VERSION) {
        console.log('[MultiTicket] Versión antigua detectada, limpiando...');
        localStorage.removeItem(TICKETS_STORAGE_KEY);
        return null;
      }

      // Verificar que el userId coincide
      const currentUserId = getCurrentUserId();
      if (parsed.userId !== currentUserId) {
        console.log('[MultiTicket] UserId diferente, ignorando datos guardados');
        return null;
      }

      // Verificar que los datos no son muy antiguos (24 horas)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > maxAge) {
        console.log('[MultiTicket] Datos expirados (>24h), limpiando...');
        localStorage.removeItem(TICKETS_STORAGE_KEY);
        return null;
      }

      console.log('[MultiTicket] Estado restaurado:', {
        ticketCount: parsed.tickets?.length,
        activeTicketId: parsed.activeTicketId
      });

      return {
        tickets: parsed.tickets || [],
        activeTicketId: parsed.activeTicketId
      };
    } catch (e) {
      console.error('[MultiTicket] Error al cargar:', e);
      localStorage.removeItem(TICKETS_STORAGE_KEY);
      return null;
    }
  }, [getCurrentUserId]);

  // Guardar estado en localStorage (con debounce)
  const saveTickets = useCallback((ticketsData, activeId) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const toSave = {
          version: TICKETS_VERSION,
          timestamp: Date.now(),
          userId: getCurrentUserId(),
          tickets: ticketsData,
          activeTicketId: activeId
        };

        localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(toSave));
        console.log('[MultiTicket] Estado guardado:', {
          ticketCount: ticketsData.length,
          activeId
        });
      } catch (e) {
        console.error('[MultiTicket] Error al guardar:', e);
      }
    }, 300);
  }, [getCurrentUserId]);

  // Inicialización
  useEffect(() => {
    const savedData = loadTickets();
    
    if (savedData && savedData.tickets.length > 0) {
      setTickets(savedData.tickets);
      // Verificar que el activeTicketId existe
      const activeExists = savedData.tickets.some(t => t.id === savedData.activeTicketId);
      setActiveTicketId(activeExists ? savedData.activeTicketId : savedData.tickets[0].id);
    } else {
      // Crear ticket inicial
      const initialTicket = createEmptyTicket(generateTicketId());
      setTickets([initialTicket]);
      setActiveTicketId(initialTicket.id);
    }
    
    setIsInitialized(true);
  }, [loadTickets]);

  // Guardar cuando cambia el estado
  useEffect(() => {
    if (isInitialized && tickets.length > 0) {
      saveTickets(tickets, activeTicketId);
    }
  }, [tickets, activeTicketId, isInitialized, saveTickets]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Obtener el ticket activo
  const activeTicket = tickets.find(t => t.id === activeTicketId);

  // Crear nuevo ticket
  const createTicket = useCallback(() => {
    const newTicket = createEmptyTicket(generateTicketId());
    setTickets(prev => [...prev, newTicket]);
    setActiveTicketId(newTicket.id);
    console.log('[MultiTicket] Nuevo ticket creado:', newTicket.id);
    return newTicket.id;
  }, []);

  // Cambiar ticket activo
  const switchToTicket = useCallback((ticketId) => {
    const exists = tickets.some(t => t.id === ticketId);
    if (exists) {
      setActiveTicketId(ticketId);
      console.log('[MultiTicket] Cambiado a ticket:', ticketId);
    }
  }, [tickets]);

  // Cerrar/eliminar ticket
  const closeTicket = useCallback((ticketId) => {
    setTickets(prev => {
      const remaining = prev.filter(t => t.id !== ticketId);
      
      // Si no quedan tickets, crear uno nuevo
      if (remaining.length === 0) {
        const newTicket = createEmptyTicket(generateTicketId());
        setActiveTicketId(newTicket.id);
        return [newTicket];
      }
      
      // Si cerramos el ticket activo, cambiar al primero disponible
      if (ticketId === activeTicketId) {
        const nextTicket = remaining[0];
        setActiveTicketId(nextTicket.id);
      }
      
      return remaining;
    });
    console.log('[MultiTicket] Ticket cerrado:', ticketId);
  }, [activeTicketId]);

  // Actualizar datos del ticket activo
  const updateActiveTicketData = useCallback((updates) => {
    setTickets(prev => prev.map(ticket => {
      if (ticket.id === activeTicketId) {
        return {
          ...ticket,
          data: { ...ticket.data, ...updates }
        };
      }
      return ticket;
    }));
  }, [activeTicketId]);

  // Setters individuales para el ticket activo
  const setCustomer = useCallback((customer) => {
    updateActiveTicketData({ customer });
  }, [updateActiveTicketData]);

  const setCustomerHistory = useCallback((customerHistory) => {
    updateActiveTicketData({ customerHistory });
  }, [updateActiveTicketData]);

  const setItems = useCallback((itemsOrUpdater) => {
    setTickets(prev => prev.map(ticket => {
      if (ticket.id === activeTicketId) {
        const newItems = typeof itemsOrUpdater === 'function'
          ? itemsOrUpdater(ticket.data.items)
          : itemsOrUpdater;
        return {
          ...ticket,
          data: { ...ticket.data, items: newItems }
        };
      }
      return ticket;
    }));
  }, [activeTicketId]);

  const setDetectedPacks = useCallback((packsOrUpdater) => {
    setTickets(prev => prev.map(ticket => {
      if (ticket.id === activeTicketId) {
        const newPacks = typeof packsOrUpdater === 'function'
          ? packsOrUpdater(ticket.data.detectedPacks)
          : packsOrUpdater;
        return {
          ...ticket,
          data: { ...ticket.data, detectedPacks: newPacks }
        };
      }
      return ticket;
    }));
  }, [activeTicketId]);

  const setNumDays = useCallback((days) => {
    updateActiveTicketData({ numDays: days });
  }, [updateActiveTicketData]);

  const setStartDate = useCallback((date) => {
    updateActiveTicketData({ startDate: date });
  }, [updateActiveTicketData]);

  const setEndDate = useCallback((date) => {
    updateActiveTicketData({ endDate: date });
  }, [updateActiveTicketData]);

  const setNotes = useCallback((notes) => {
    updateActiveTicketData({ notes });
  }, [updateActiveTicketData]);

  const setDiscountType = useCallback((type) => {
    updateActiveTicketData({ discountType: type });
  }, [updateActiveTicketData]);

  const setDiscountValue = useCallback((value) => {
    updateActiveTicketData({ discountValue: value });
  }, [updateActiveTicketData]);

  const setDiscountReason = useCallback((reason) => {
    updateActiveTicketData({ discountReason: reason });
  }, [updateActiveTicketData]);

  // Limpiar ticket activo (reset a vacío)
  const clearActiveTicket = useCallback(() => {
    setTickets(prev => prev.map(ticket => {
      if (ticket.id === activeTicketId) {
        return {
          ...ticket,
          data: createEmptyTicket(ticket.id).data
        };
      }
      return ticket;
    }));
    console.log('[MultiTicket] Ticket activo limpiado');
  }, [activeTicketId]);

  // Cerrar ticket activo y pasar al siguiente (para cuando se completa un alquiler)
  const completeAndCloseActiveTicket = useCallback(() => {
    const currentIndex = tickets.findIndex(t => t.id === activeTicketId);
    const closedId = activeTicketId;
    
    setTickets(prev => {
      const remaining = prev.filter(t => t.id !== closedId);
      
      if (remaining.length === 0) {
        const newTicket = createEmptyTicket(generateTicketId());
        setActiveTicketId(newTicket.id);
        return [newTicket];
      }
      
      // Pasar al siguiente ticket (o al anterior si era el último)
      const nextIndex = Math.min(currentIndex, remaining.length - 1);
      setActiveTicketId(remaining[nextIndex].id);
      
      return remaining;
    });
    
    console.log('[MultiTicket] Ticket completado y cerrado:', closedId);
  }, [activeTicketId, tickets]);

  // Obtener nombre para mostrar en la pestaña
  const getTicketDisplayName = useCallback((ticket, index) => {
    if (ticket.data.customer?.name) {
      // Si hay cliente, mostrar nombre (acortado si es muy largo)
      const name = ticket.data.customer.name;
      return name.length > 15 ? name.substring(0, 15) + '...' : name;
    }
    return `Ticket ${index + 1}`;
  }, []);

  // Datos del ticket activo (para compatibilidad con el código existente)
  const activeData = activeTicket?.data || createEmptyTicket('temp').data;

  return {
    // Estado
    isInitialized,
    tickets,
    activeTicketId,
    activeTicket,
    
    // Datos del ticket activo (compatibilidad)
    customer: activeData.customer,
    customerHistory: activeData.customerHistory,
    items: activeData.items,
    detectedPacks: activeData.detectedPacks,
    numDays: activeData.numDays,
    startDate: activeData.startDate,
    endDate: activeData.endDate,
    notes: activeData.notes,
    discountType: activeData.discountType,
    discountValue: activeData.discountValue,
    discountReason: activeData.discountReason,
    
    // Setters del ticket activo
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
    
    // Gestión de tickets
    createTicket,
    switchToTicket,
    closeTicket,
    clearActiveTicket,
    completeAndCloseActiveTicket,
    getTicketDisplayName,
    
    // Compatibilidad
    clearCart: clearActiveTicket,
    hasCartData: activeData.items.length > 0 || activeData.customer !== null
  };
}

/**
 * Función utilitaria para limpiar todos los tickets
 */
export function clearAllPersistedTickets() {
  localStorage.removeItem(TICKETS_STORAGE_KEY);
  console.log('[MultiTicket] Todos los tickets eliminados');
}

export default useMultiTicketPersistence;
