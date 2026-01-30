/**
 * Ticket Generator - Centralized ticket generation using Settings configuration
 * 
 * This module provides consistent ticket generation across the entire application,
 * ensuring all prints match the design configured in Settings.
 */

/**
 * Generate the complete HTML for a ticket
 * @param {Object} options - Ticket options
 * @param {Object} options.settings - Settings from SettingsContext
 * @param {string} options.ticketType - 'rental' | 'return' | 'swap' | 'movement' | 'closing'
 * @param {Object} options.data - Ticket-specific data
 * @returns {string} Complete HTML document for the ticket
 */
export function generateTicketHTML(options) {
  const { settings, ticketType, data } = options;
  
  // Extract settings with defaults
  const {
    companyLogo = null,
    ticketHeader = 'TIENDA DE ALQUILER DE ESQUÍ',
    ticketFooter = '¡Gracias por su visita!',
    ticketTerms = '',
    showDniOnTicket = true,
    showVatOnTicket = false,
    defaultVat = 21,
    vatIncludedInPrices = true,
    language = 'es'
  } = settings || {};

  // Translations
  const t = getTranslations(language);

  // Get ticket title based on type
  const ticketTitle = getTicketTitle(ticketType, t);

  // Calculate VAT if needed
  const vatInfo = calculateVatInfo(data.total || 0, defaultVat, vatIncludedInPrices);

  // Build the HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${ticketTitle}</title>
      <style>
        /* ========== RESET & BASE ========== */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        /* ========== PRINT-SPECIFIC: THERMAL PRINTER 80mm OPTIMIZATION ========== */
        /* 1. Eliminación de ruido del navegador (headers/footers/URL/fecha) */
        @page { 
          size: 80mm auto;  /* Ancho estándar papel térmico */
          margin: 0;        /* CRÍTICO: Elimina encabezados y pies del navegador */
        }
        
        @media print {
          /* Forzar colores de impresión para térmicas */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* 2. Ancho del papel: 80mm sin márgenes laterales */
          html, body {
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 2mm !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          
          /* 4. Contraste: Texto negro puro (#000000) y fondo blanco */
          body, p, span, div, td, th, strong, b, h1, h2, h3, h4, h5, h6, 
          .info-row, .item-row, .total-row, .section-title, .header, .footer, .terms {
            color: #000000 !important;
            background: #ffffff !important;
          }
          
          /* Ocultar botón de impresión */
          .print-btn, .no-print { 
            display: none !important; 
          }
          
          /* 3. Corte de papel: Evitar que tablas/filas se corten a la mitad */
          .ticket-container, 
          .section, 
          .item-row, 
          .info-row,
          .total-section,
          .total-row,
          tr, td, th,
          table, tbody {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Contenedor principal a ancho completo */
          .ticket-container {
            width: 100% !important;
            max-width: 80mm !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Eliminar colores de fondo decorativos */
          .date-range, .operation-number {
            background: transparent !important;
            border: 1px solid #000000 !important;
          }
          
          /* Líneas de separación visibles */
          .section, .header, .footer, .terms, .logo {
            border-color: #000000 !important;
          }
        }
        
        /* ========== SCREEN STYLES (Vista previa en navegador) ========== */
        body {
          font-family: 'Courier New', 'Consolas', monospace;
          font-size: 11px;
          line-height: 1.4;
          padding: 8mm;
          max-width: 80mm;
          width: 80mm;
          margin: 0 auto;
          background: white;
          color: #000000;
        }
        
        .ticket-container {
          width: 100%;
          max-width: 80mm;
          background: #ffffff;
        }
        
        .logo { text-align: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed #000000; }
        .logo img { max-height: 50px; max-width: 100%; object-fit: contain; }
        .header { text-align: center; white-space: pre-wrap; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed #000000; font-size: 10px; color: #000000; }
        .title { text-align: center; font-weight: bold; font-size: 14px; margin: 10px 0; padding: 5px 0; border-bottom: 2px solid #000000; color: #000000; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; page-break-inside: avoid; color: #000000; }
        .info-row .label { font-weight: normal; color: #000000; }
        .info-row .value { font-weight: bold; text-align: right; max-width: 55%; color: #000000; }
        .section { margin: 10px 0; padding: 10px 0; border-top: 1px dashed #000000; border-bottom: 1px dashed #000000; page-break-inside: avoid; }
        .section-title { font-weight: bold; margin-bottom: 6px; color: #000000; }
        .item-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 10px; page-break-inside: avoid; color: #000000; }
        .item-name { max-width: 65%; overflow: hidden; text-overflow: ellipsis; color: #000000; }
        .item-price { font-weight: bold; color: #000000; }
        .total-section { margin-top: 10px; padding-top: 10px; border-top: 2px double #000000; page-break-inside: avoid; }
        .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; color: #000000; }
        .vat-note { text-align: center; font-size: 9px; color: #000000; margin-top: 4px; }
        .vat-breakdown { margin: 6px 0; font-size: 10px; color: #000000; }
        .footer { text-align: center; white-space: pre-wrap; margin-top: 12px; padding-top: 10px; border-top: 1px dashed #000000; font-size: 10px; color: #000000; }
        .terms { text-align: center; font-size: 8px; color: #000000; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #000000; }
        .print-btn { 
          display: block; width: 100%; padding: 12px; margin-top: 15px; 
          background: #2563eb; color: white; border: none; 
          font-size: 14px; font-weight: bold; cursor: pointer; border-radius: 4px;
        }
        .print-btn:hover { background: #1d4ed8; }
        .date-range { background: #f0f0f0; padding: 6px; border-radius: 4px; margin: 8px 0; text-align: center; font-size: 10px; color: #000000; }
        .date-range strong { font-size: 11px; color: #000000; }
        .balance-positive { color: #000000; font-weight: bold; }
        .balance-negative { color: #000000; font-weight: bold; }
        .operation-number { font-family: monospace; font-size: 10px; background: #e0e0e0; padding: 4px 8px; border-radius: 3px; color: #000000; }
      </style>
    </head>
    <body>
      <div class="ticket-container">
      ${renderLogo(companyLogo)}
      ${renderHeader(ticketHeader)}
      ${renderTitle(ticketTitle)}
      ${renderTicketBody(ticketType, data, t, showDniOnTicket, showVatOnTicket, defaultVat, vatIncludedInPrices, vatInfo)}
      ${renderFooter(ticketFooter)}
      ${renderTerms(ticketTerms)}
      </div>
      <button class="print-btn" onclick="window.print(); setTimeout(() => window.close(), 500);">${t.print}</button>
    </body>
    </html>
  `;
}

function getTranslations(language) {
  const translations = {
    es: {
      print: 'IMPRIMIR',
      date: 'Fecha',
      customer: 'Cliente',
      dni: 'DNI/ID',
      items: 'Artículos',
      days: 'días',
      day: 'día',
      from: 'Desde',
      to: 'Hasta',
      dateRange: 'Periodo de alquiler',
      subtotal: 'Subtotal',
      vat: 'IVA',
      total: 'TOTAL',
      vatIncluded: 'IVA incluido',
      paymentMethod: 'Forma de pago',
      cash: 'Efectivo',
      card: 'Tarjeta',
      operationNumber: 'Nº Operación',
      rentalTicket: 'TICKET DE ALQUILER',
      returnTicket: 'TICKET DE DEVOLUCIÓN',
      swapTicket: 'TICKET DE CAMBIO',
      movementTicket: 'TICKET DE CAJA',
      closingTicket: 'CIERRE DE CAJA',
      refund: 'Devolución',
      supplement: 'Suplemento',
      adjustment: 'Ajuste',
      income: 'Ingreso',
      expense: 'Salida',
      balance: 'Saldo',
      returned: 'Devuelto',
      changed: 'Cambiado'
    },
    en: {
      print: 'PRINT',
      date: 'Date',
      customer: 'Customer',
      dni: 'ID',
      items: 'Items',
      days: 'days',
      day: 'day',
      from: 'From',
      to: 'Until',
      dateRange: 'Rental period',
      subtotal: 'Subtotal',
      vat: 'VAT',
      total: 'TOTAL',
      vatIncluded: 'VAT included',
      paymentMethod: 'Payment method',
      cash: 'Cash',
      card: 'Card',
      operationNumber: 'Operation #',
      rentalTicket: 'RENTAL TICKET',
      returnTicket: 'RETURN TICKET',
      swapTicket: 'EXCHANGE TICKET',
      movementTicket: 'CASH MOVEMENT',
      closingTicket: 'CASH CLOSING',
      refund: 'Refund',
      supplement: 'Supplement',
      adjustment: 'Adjustment',
      income: 'Income',
      expense: 'Expense',
      balance: 'Balance',
      returned: 'Returned',
      changed: 'Changed'
    }
  };
  return translations[language] || translations.es;
}

function getTicketTitle(ticketType, t) {
  const titles = {
    rental: t.rentalTicket,
    return: t.returnTicket,
    swap: t.swapTicket,
    movement: t.movementTicket,
    closing: t.closingTicket
  };
  return titles[ticketType] || t.rentalTicket;
}

function calculateVatInfo(total, vatRate, vatIncluded) {
  if (vatIncluded) {
    const base = total / (1 + vatRate / 100);
    const vat = total - base;
    return { base, vat, total };
  } else {
    const vat = total * (vatRate / 100);
    return { base: total, vat, total: total + vat };
  }
}

function renderLogo(logo) {
  if (!logo) return '';
  return `<div class="logo"><img src="${logo}" alt="Logo" /></div>`;
}

function renderHeader(header) {
  if (!header) return '';
  return `<div class="header">${escapeHtml(header)}</div>`;
}

function renderTitle(title) {
  return `<div class="title">${escapeHtml(title)}</div>`;
}

function renderFooter(footer) {
  if (!footer) return '';
  return `<div class="footer">${escapeHtml(footer)}</div>`;
}

function renderTerms(terms) {
  if (!terms) return '';
  return `<div class="terms">${escapeHtml(terms)}</div>`;
}

function renderTicketBody(ticketType, data, t, showDni, showVat, vatRate, vatIncluded, vatInfo) {
  switch (ticketType) {
    case 'rental':
      return renderRentalBody(data, t, showDni, showVat, vatRate, vatIncluded, vatInfo);
    case 'return':
      return renderReturnBody(data, t, showDni);
    case 'swap':
      return renderSwapBody(data, t, showDni);
    case 'movement':
      return renderMovementBody(data, t);
    case 'closing':
      return renderClosingBody(data, t);
    default:
      return renderRentalBody(data, t, showDni, showVat, vatRate, vatIncluded, vatInfo);
  }
}

function renderRentalBody(data, t, showDni, showVat, vatRate, vatIncluded, vatInfo) {
  const {
    operationNumber = '',
    date = new Date().toLocaleDateString('es-ES'),
    customer = '',
    dni = '',
    startDate = '',
    endDate = '',
    days = 1,
    items = [],
    total = 0,
    paymentMethod = 'efectivo'
  } = data;

  const paymentMethodLabel = paymentMethod === 'efectivo' || paymentMethod === 'cash' 
    ? t.cash 
    : t.card;

  return `
    <!-- Operation Number -->
    ${operationNumber ? `
      <div class="info-row">
        <span class="label">${t.operationNumber}:</span>
        <span class="value operation-number">${escapeHtml(operationNumber)}</span>
      </div>
    ` : ''}

    <!-- Date -->
    <div class="info-row">
      <span class="label">${t.date}:</span>
      <span class="value">${escapeHtml(date)}</span>
    </div>

    <!-- Customer -->
    <div class="info-row">
      <span class="label">${t.customer}:</span>
      <span class="value">${escapeHtml(customer)}</span>
    </div>

    <!-- DNI (conditional) -->
    ${showDni && dni ? `
      <div class="info-row">
        <span class="label">${t.dni}:</span>
        <span class="value">${escapeHtml(dni)}</span>
      </div>
    ` : ''}

    <!-- Date Range -->
    ${startDate && endDate ? `
      <div class="date-range">
        <strong>${t.dateRange}</strong><br/>
        ${t.from}: ${formatDate(startDate)} - ${t.to}: ${formatDate(endDate)}<br/>
        <strong>(${days} ${days === 1 ? t.day : t.days})</strong>
      </div>
    ` : ''}

    <!-- Items -->
    <div class="section">
      <div class="section-title">${t.items}:</div>
      ${items.map(item => `
        <div class="item-row">
          <span class="item-name">${escapeHtml(item.name || item.item_type || 'Artículo')}</span>
          <span class="item-price">€${(item.price || item.subtotal || 0).toFixed(2)}</span>
        </div>
      `).join('')}
    </div>

    <!-- VAT Breakdown (conditional) -->
    ${showVat ? `
      <div class="vat-breakdown">
        <div class="info-row">
          <span class="label">${t.subtotal}:</span>
          <span class="value">€${vatInfo.base.toFixed(2)}</span>
        </div>
        <div class="info-row">
          <span class="label">${t.vat} (${vatRate}%):</span>
          <span class="value">€${vatInfo.vat.toFixed(2)}</span>
        </div>
      </div>
    ` : ''}

    <!-- Total -->
    <div class="total-section">
      <div class="total-row">
        <span>${t.total}:</span>
        <span>€${total.toFixed(2)}</span>
      </div>
      ${!showVat && vatIncluded ? `<div class="vat-note">(${t.vatIncluded})</div>` : ''}
    </div>

    <!-- Payment Method -->
    <div class="info-row" style="margin-top: 10px;">
      <span class="label">${t.paymentMethod}:</span>
      <span class="value">${paymentMethodLabel}</span>
    </div>
  `;
}

function renderReturnBody(data, t, showDni) {
  const {
    operationNumber = '',
    date = new Date().toLocaleDateString('es-ES'),
    customer = '',
    dni = '',
    returnedItems = [],
    refundAmount = 0
  } = data;

  return `
    ${operationNumber ? `
      <div class="info-row">
        <span class="label">${t.operationNumber}:</span>
        <span class="value operation-number">${escapeHtml(operationNumber)}</span>
      </div>
    ` : ''}

    <div class="info-row">
      <span class="label">${t.date}:</span>
      <span class="value">${escapeHtml(date)}</span>
    </div>

    <div class="info-row">
      <span class="label">${t.customer}:</span>
      <span class="value">${escapeHtml(customer)}</span>
    </div>

    ${showDni && dni ? `
      <div class="info-row">
        <span class="label">${t.dni}:</span>
        <span class="value">${escapeHtml(dni)}</span>
      </div>
    ` : ''}

    <div class="section">
      <div class="section-title">${t.returned}:</div>
      ${returnedItems.map(item => `
        <div class="item-row">
          <span class="item-name">${escapeHtml(item.name || item.item_type || 'Artículo')}</span>
          <span class="item-price">${item.days || '-'} ${t.days}</span>
        </div>
      `).join('')}
    </div>

    <div class="total-section">
      <div class="total-row ${refundAmount >= 0 ? 'balance-positive' : 'balance-negative'}">
        <span>${refundAmount >= 0 ? t.refund : t.supplement}:</span>
        <span>€${Math.abs(refundAmount).toFixed(2)}</span>
      </div>
    </div>
  `;
}

function renderSwapBody(data, t, showDni) {
  const {
    operationNumber = '',
    date = new Date().toLocaleDateString('es-ES'),
    customer = '',
    dni = '',
    oldItems = [],
    newItems = [],
    difference = 0,
    paymentMethod = 'efectivo'
  } = data;

  const paymentMethodLabel = paymentMethod === 'efectivo' || paymentMethod === 'cash' 
    ? t.cash 
    : t.card;

  return `
    ${operationNumber ? `
      <div class="info-row">
        <span class="label">${t.operationNumber}:</span>
        <span class="value operation-number">${escapeHtml(operationNumber)}</span>
      </div>
    ` : ''}

    <div class="info-row">
      <span class="label">${t.date}:</span>
      <span class="value">${escapeHtml(date)}</span>
    </div>

    <div class="info-row">
      <span class="label">${t.customer}:</span>
      <span class="value">${escapeHtml(customer)}</span>
    </div>

    ${showDni && dni ? `
      <div class="info-row">
        <span class="label">${t.dni}:</span>
        <span class="value">${escapeHtml(dni)}</span>
      </div>
    ` : ''}

    ${oldItems.length > 0 ? `
      <div class="section">
        <div class="section-title">❌ ${t.returned}:</div>
        ${oldItems.map(item => `
          <div class="item-row">
            <span class="item-name">${escapeHtml(item.name || item.item_type || 'Artículo')}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${newItems.length > 0 ? `
      <div class="section">
        <div class="section-title">✓ ${t.changed}:</div>
        ${newItems.map(item => `
          <div class="item-row">
            <span class="item-name">${escapeHtml(item.name || item.item_type || 'Artículo')}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="total-section">
      <div class="total-row ${difference >= 0 ? 'balance-positive' : 'balance-negative'}">
        <span>${difference >= 0 ? t.supplement : t.refund}:</span>
        <span>€${Math.abs(difference).toFixed(2)}</span>
      </div>
    </div>

    ${difference !== 0 ? `
      <div class="info-row" style="margin-top: 10px;">
        <span class="label">${t.paymentMethod}:</span>
        <span class="value">${paymentMethodLabel}</span>
      </div>
    ` : ''}
  `;
}

function renderMovementBody(data, t) {
  const {
    operationNumber = '',
    date = new Date().toLocaleDateString('es-ES'),
    category = 'income',
    description = '',
    amount = 0,
    paymentMethod = 'efectivo'
  } = data;

  const isIncome = category === 'income' || category === 'rental' || amount >= 0;
  const categoryLabel = isIncome ? t.income : t.expense;
  const paymentMethodLabel = paymentMethod === 'efectivo' || paymentMethod === 'cash' 
    ? t.cash 
    : t.card;

  return `
    ${operationNumber ? `
      <div class="info-row">
        <span class="label">${t.operationNumber}:</span>
        <span class="value operation-number">${escapeHtml(operationNumber)}</span>
      </div>
    ` : ''}

    <div class="info-row">
      <span class="label">${t.date}:</span>
      <span class="value">${escapeHtml(date)}</span>
    </div>

    <div class="info-row">
      <span class="label">Tipo:</span>
      <span class="value">${categoryLabel}</span>
    </div>

    ${description ? `
      <div class="section">
        <div class="section-title">Descripción:</div>
        <p style="margin-top: 4px;">${escapeHtml(description)}</p>
      </div>
    ` : ''}

    <div class="total-section">
      <div class="total-row ${isIncome ? 'balance-positive' : 'balance-negative'}">
        <span>${t.total}:</span>
        <span>${isIncome ? '+' : '-'}€${Math.abs(amount).toFixed(2)}</span>
      </div>
    </div>

    <div class="info-row" style="margin-top: 10px;">
      <span class="label">${t.paymentMethod}:</span>
      <span class="value">${paymentMethodLabel}</span>
    </div>
  `;
}

function renderClosingBody(data, t) {
  const {
    date = new Date().toLocaleDateString('es-ES'),
    shiftNumber = 1,
    totalIncome = 0,
    totalExpense = 0,
    balance = 0,
    countCash = 0,
    countCard = 0
  } = data;

  return `
    <div class="info-row">
      <span class="label">${t.date}:</span>
      <span class="value">${escapeHtml(date)}</span>
    </div>

    <div class="info-row">
      <span class="label">Turno:</span>
      <span class="value">#${shiftNumber}</span>
    </div>

    <div class="section">
      <div class="section-title">Resumen:</div>
      
      <div class="item-row">
        <span class="item-name">${t.income}:</span>
        <span class="item-price balance-positive">+€${totalIncome.toFixed(2)}</span>
      </div>
      
      <div class="item-row">
        <span class="item-name">${t.expense}:</span>
        <span class="item-price balance-negative">-€${totalExpense.toFixed(2)}</span>
      </div>
    </div>

    <div class="total-section">
      <div class="total-row ${balance >= 0 ? 'balance-positive' : 'balance-negative'}">
        <span>${t.balance}:</span>
        <span>€${balance.toFixed(2)}</span>
      </div>
    </div>

    <div class="section" style="border-bottom: none;">
      <div class="section-title">Desglose:</div>
      <div class="item-row">
        <span class="item-name">${t.cash}:</span>
        <span class="item-price">€${countCash.toFixed(2)}</span>
      </div>
      <div class="item-row">
        <span class="item-name">${t.card}:</span>
        <span class="item-price">€${countCard.toFixed(2)}</span>
      </div>
    </div>
  `;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Open a new window and print a ticket
 * @param {Object} options - Same as generateTicketHTML
 */
export function printTicket(options) {
  const html = generateTicketHTML(options);
  const printWindow = window.open('', '_blank', 'width=400,height=700');
  
  if (!printWindow) {
    console.error('Could not open print window. Please allow popups.');
    return false;
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  
  return true;
}

/**
 * Get settings from localStorage (for use outside React components)
 */
export function getStoredSettings() {
  try {
    return {
      companyLogo: localStorage.getItem('companyLogo') || null,
      ticketHeader: localStorage.getItem('ticketHeader') || 'TIENDA DE ALQUILER DE ESQUÍ',
      ticketFooter: localStorage.getItem('ticketFooter') || '¡Gracias por su visita!',
      ticketTerms: localStorage.getItem('ticketTerms') || '',
      showDniOnTicket: localStorage.getItem('showDniOnTicket') === 'true',
      showVatOnTicket: localStorage.getItem('showVatOnTicket') === 'true',
      defaultVat: parseFloat(localStorage.getItem('defaultVat')) || 21,
      vatIncludedInPrices: localStorage.getItem('vatIncludedInPrices') !== 'false',
      language: localStorage.getItem('language') || 'es'
    };
  } catch {
    return {
      companyLogo: null,
      ticketHeader: 'TIENDA DE ALQUILER DE ESQUÍ',
      ticketFooter: '¡Gracias por su visita!',
      ticketTerms: '',
      showDniOnTicket: true,
      showVatOnTicket: false,
      defaultVat: 21,
      vatIncludedInPrices: true,
      language: 'es'
    };
  }
}
