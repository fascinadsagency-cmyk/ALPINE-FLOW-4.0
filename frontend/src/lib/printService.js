/**
 * ============================================================================
 * PRINT SERVICE - SERVICIO DE IMPRESIÓN GLOBAL (PRINTER-READY)
 * ============================================================================
 * 
 * Este servicio proporciona una abstracción universal para la impresión en
 * toda la aplicación. Características:
 * 
 * - Invocable desde cualquier componente (Ventas, Devoluciones, Fichas)
 * - Genera un bloque de impresión oculto y dispara window.print() de forma asíncrona
 * - No bloquea el hilo principal (Non-blocking)
 * - Cola de impresión para múltiples tickets
 * - Callback de limpieza post-impresión
 * - Compatible con impresoras térmicas de 80mm (rollo)
 * 
 * USO:
 *   import { PrintService } from '@/lib/printService';
 *   
 *   // Imprimir un ticket
 *   PrintService.print({
 *     ticketType: 'rental',
 *     data: { ... },
 *     onComplete: () => console.log('Impresión completada'),
 *     onError: (err) => console.error('Error:', err)
 *   });
 *   
 *   // Verificar si hay impresión en curso
 *   if (PrintService.isPrinting()) { ... }
 */

import { generateTicketHTML, getStoredSettings } from './ticketGenerator';

// ============================================================================
// ESTADO GLOBAL DEL SERVICIO
// ============================================================================
const PrintState = {
  isActive: false,
  currentWindow: null,
  queue: [],
  printContainerId: 'print-service-container',
};

// ============================================================================
// UTILIDADES INTERNAS
// ============================================================================

/**
 * Crea o obtiene el contenedor oculto de impresión en el DOM
 */
function getOrCreatePrintContainer() {
  let container = document.getElementById(PrintState.printContainerId);
  
  if (!container) {
    container = document.createElement('div');
    container.id = PrintState.printContainerId;
    container.setAttribute('aria-hidden', 'true');
    // Estilos para que sea invisible pero accesible para impresión
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: -9999px;
      width: 80mm;
      max-width: 80mm;
      visibility: hidden;
      pointer-events: none;
      z-index: -1;
    `;
    document.body.appendChild(container);
  }
  
  return container;
}

/**
 * Limpia el contenedor de impresión
 */
function clearPrintContainer() {
  const container = document.getElementById(PrintState.printContainerId);
  if (container) {
    container.innerHTML = '';
  }
}

/**
 * Genera un ID único para cada trabajo de impresión
 */
function generatePrintJobId() {
  return `print-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// MÉTODOS PRINCIPALES DEL SERVICIO
// ============================================================================

/**
 * Encola y ejecuta un trabajo de impresión
 * 
 * @param {Object} options - Opciones de impresión
 * @param {string} options.ticketType - Tipo de ticket ('rental', 'return', 'swap', 'movement', 'closing')
 * @param {Object} options.data - Datos del ticket
 * @param {Object} [options.settings] - Configuración personalizada (opcional)
 * @param {Function} [options.onComplete] - Callback al completar la impresión
 * @param {Function} [options.onError] - Callback en caso de error
 * @param {boolean} [options.silent] - Si es true, no muestra la ventana de previsualización
 * @param {boolean} [options.immediate] - Si es true, salta la cola y ejecuta inmediatamente
 * @returns {Promise<boolean>} - Resuelve a true si la impresión fue exitosa
 */
async function print(options) {
  const {
    ticketType,
    data,
    settings: customSettings,
    onComplete,
    onError,
    silent = false,
    immediate = false,
  } = options;

  const jobId = generatePrintJobId();
  const settings = customSettings || getStoredSettings();

  // Crear el trabajo de impresión
  const printJob = {
    id: jobId,
    ticketType,
    data,
    settings,
    onComplete,
    onError,
    silent,
    timestamp: Date.now(),
  };

  // Si es inmediato o la cola está vacía, ejecutar directamente
  if (immediate || PrintState.queue.length === 0) {
    PrintState.queue.push(printJob);
    return executePrintJob(printJob);
  }

  // Encolar para procesamiento posterior
  PrintState.queue.push(printJob);
  
  // Si no hay impresión activa, procesar la cola
  if (!PrintState.isActive) {
    return processQueue();
  }

  return true;
}

/**
 * Ejecuta un trabajo de impresión específico
 * 
 * @param {Object} job - El trabajo de impresión a ejecutar
 * @returns {Promise<boolean>}
 */
async function executePrintJob(job) {
  return new Promise((resolve) => {
    PrintState.isActive = true;

    try {
      // Generar el HTML del ticket
      const html = generateTicketHTML({
        ticketType: job.ticketType,
        data: job.data,
        settings: job.settings,
      });

      // Abrir ventana de impresión (no bloqueante)
      const printWindow = window.open('', '_blank', 'width=400,height=700,scrollbars=yes,resizable=yes');

      if (!printWindow) {
        const error = new Error('No se pudo abrir la ventana de impresión. Permite los popups en tu navegador.');
        console.error('[PrintService]', error.message);
        
        if (job.onError) {
          job.onError(error);
        }
        
        // Limpiar y continuar con la cola
        cleanupJob(job.id);
        resolve(false);
        return;
      }

      PrintState.currentWindow = printWindow;

      // Escribir el contenido
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();

      // Configurar listeners para detectar cierre de ventana
      const checkClosed = setInterval(() => {
        if (printWindow.closed) {
          clearInterval(checkClosed);
          
          // Ejecutar callback de completado
          if (job.onComplete) {
            // Ejecutar de forma asíncrona para no bloquear
            setTimeout(() => job.onComplete(), 0);
          }
          
          // Limpiar y procesar siguiente en cola
          cleanupJob(job.id);
          resolve(true);
          
          // Procesar siguiente trabajo si hay cola
          processQueue();
        }
      }, 200);

      // Timeout de seguridad (2 minutos)
      setTimeout(() => {
        clearInterval(checkClosed);
        if (!printWindow.closed) {
          console.warn('[PrintService] Timeout de impresión alcanzado');
        }
        cleanupJob(job.id);
        resolve(true);
      }, 120000);

      // Verificar si debemos imprimir doble copia
      if (job.settings.printDoubleCopy) {
        setTimeout(() => {
          const secondWindow = window.open('', '_blank', 'width=400,height=700,scrollbars=yes,resizable=yes');
          if (secondWindow) {
            secondWindow.document.write(html);
            secondWindow.document.close();
            secondWindow.focus();
          }
        }, 1000);
      }

    } catch (error) {
      console.error('[PrintService] Error en impresión:', error);
      
      if (job.onError) {
        job.onError(error);
      }
      
      cleanupJob(job.id);
      resolve(false);
    }
  });
}

/**
 * Procesa la cola de impresión
 */
async function processQueue() {
  if (PrintState.isActive || PrintState.queue.length === 0) {
    return;
  }

  const nextJob = PrintState.queue[0];
  if (nextJob) {
    await executePrintJob(nextJob);
  }
}

/**
 * Limpia un trabajo de la cola
 */
function cleanupJob(jobId) {
  PrintState.queue = PrintState.queue.filter(job => job.id !== jobId);
  PrintState.isActive = false;
  PrintState.currentWindow = null;
}

/**
 * Verifica si hay una impresión en curso
 * @returns {boolean}
 */
function isPrinting() {
  return PrintState.isActive;
}

/**
 * Obtiene el número de trabajos en cola
 * @returns {number}
 */
function getQueueLength() {
  return PrintState.queue.length;
}

/**
 * Limpia toda la cola de impresión
 */
function clearQueue() {
  PrintState.queue = [];
  PrintState.isActive = false;
  if (PrintState.currentWindow && !PrintState.currentWindow.closed) {
    PrintState.currentWindow.close();
  }
  PrintState.currentWindow = null;
}

/**
 * Imprime usando el método de iframe oculto (alternativo, más silencioso)
 * Este método no abre una ventana popup, sino que usa un iframe oculto
 * 
 * @param {Object} options - Mismas opciones que print()
 * @returns {Promise<boolean>}
 */
async function printSilent(options) {
  return new Promise((resolve) => {
    try {
      const settings = options.settings || getStoredSettings();
      const html = generateTicketHTML({
        ticketType: options.ticketType,
        data: options.data,
        settings,
      });

      // Crear iframe oculto
      const iframe = document.createElement('iframe');
      iframe.style.cssText = `
        position: fixed;
        right: 0;
        bottom: 0;
        width: 0;
        height: 0;
        border: none;
        visibility: hidden;
      `;
      iframe.setAttribute('id', `print-iframe-${Date.now()}`);
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      // Esperar a que el contenido cargue
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          
          // Limpiar después de un tiempo
          setTimeout(() => {
            document.body.removeChild(iframe);
            if (options.onComplete) {
              options.onComplete();
            }
            resolve(true);
          }, 1000);
        } catch (e) {
          console.error('[PrintService] Error en impresión silenciosa:', e);
          document.body.removeChild(iframe);
          if (options.onError) {
            options.onError(e);
          }
          resolve(false);
        }
      }, 500);

    } catch (error) {
      console.error('[PrintService] Error:', error);
      if (options.onError) {
        options.onError(error);
      }
      resolve(false);
    }
  });
}

// ============================================================================
// MÉTODOS DE CONVENIENCIA PARA TIPOS ESPECÍFICOS
// ============================================================================

/**
 * Imprime un ticket de alquiler
 */
async function printRental(data, options = {}) {
  return print({ ticketType: 'rental', data, ...options });
}

/**
 * Imprime un ticket de devolución
 */
async function printReturn(data, options = {}) {
  return print({ ticketType: 'return', data, ...options });
}

/**
 * Imprime un ticket de cambio/swap
 */
async function printSwap(data, options = {}) {
  return print({ ticketType: 'swap', data, ...options });
}

/**
 * Imprime un ticket de movimiento de caja
 */
async function printMovement(data, options = {}) {
  return print({ ticketType: 'movement', data, ...options });
}

/**
 * Imprime un cierre de caja
 */
async function printClosing(data, options = {}) {
  return print({ ticketType: 'closing', data, ...options });
}

// ============================================================================
// HOOK DE REACT PARA USO EN COMPONENTES
// ============================================================================

/**
 * Hook personalizado para usar el servicio de impresión
 * 
 * Uso:
 *   const { print, isPrinting, queueLength } = usePrintService();
 *   
 *   await print({
 *     ticketType: 'return',
 *     data: returnData,
 *     onComplete: () => toast.success('Ticket impreso')
 *   });
 */
export function usePrintService() {
  return {
    print,
    printSilent,
    printRental,
    printReturn,
    printSwap,
    printMovement,
    printClosing,
    isPrinting,
    getQueueLength,
    clearQueue,
  };
}

// ============================================================================
// EXPORTACIONES
// ============================================================================

export const PrintService = {
  print,
  printSilent,
  printRental,
  printReturn,
  printSwap,
  printMovement,
  printClosing,
  isPrinting,
  getQueueLength,
  clearQueue,
};

export default PrintService;
