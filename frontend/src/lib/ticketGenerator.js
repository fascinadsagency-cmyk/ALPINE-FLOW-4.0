/**
 * ============================================================================
 * TICKET GENERATOR - MASTER PRINT LAYOUT (PrintLayout Maestro)
 * ============================================================================
 * 
 * Este es el ÚNICO punto de generación de tickets para toda la aplicación.
 * TODAS las impresiones deben pasar por este módulo para garantizar:
 * - Consistencia visual al 100%
 * - Mismo logo, fuentes, márgenes en todos los tickets
 * - Un ticket de hace 3 meses debe verse IDÉNTICO a uno de hace 5 minutos
 * 
 * TIPOS SOPORTADOS:
 * - 'rental': Ticket de alquiler nuevo
 * - 'return': Ticket de devolución
 * - 'swap': Ticket de cambio/regularización
 * - 'movement': Ticket de movimiento de caja (venta, gasto, abono)
 * - 'closing': Cierre de caja
 */

// ============================================================================
// MASTER CSS - ESTILOS ÚNICOS PARA TODAS LAS IMPRESIONES
// ============================================================================
const getMasterCSS = (paperWidth = '80mm') => `
  /* ========== RESET GLOBAL ========== */
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  /* ========== THERMAL PRINTER - REGLA DE ORO ========== */
  /* Forzar márgenes 0 para que el navegador no añada cabeceras/pies */
  @page { 
    size: auto;
    margin: 0mm;
  }
  
  @media print {
    /* ========== CONFIGURACIÓN CRÍTICA PARA TÉRMICA ========== */
    @page {
      size: auto;
      margin: 0mm;
    }
    
    html {
      width: ${paperWidth} !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    body {
      width: ${paperWidth} !important;
      max-width: ${paperWidth} !important;
      margin: 0px !important;
      padding: 2mm !important;
      background: #ffffff !important;
      color: #000000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    /* Ocultar cabeceras y pies de página del navegador */
    header, footer, .no-print, .print-btn { 
      display: none !important; 
    }
    
    /* Forzar ancho del contenedor del ticket */
    .ticket-container {
      width: ${paperWidth} !important;
      max-width: ${paperWidth} !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    /* Forzar texto negro en impresión */
    body, p, span, div, td, th, strong, b, h1, h2, h3, h4, h5, h6,
    .info-row, .item-row, .total-row, .section-title, .header-text, 
    .footer-text, .terms-text, .block-title, .row, .row-value {
      color: #000000 !important;
    }
    
    /* Prevenir cortes de página */
    .ticket-container, .section, .item-row, .info-row, .block,
    .total-section, .total-row, tr, td, th, table, tbody {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    /* Eliminar fondos de color para térmica monocromo */
    .header-title-box, .amount-box, .highlight-box, .result-box {
      background: transparent !important;
      border: 2px solid #000000 !important;
    }
    
    .amount-value, .result-value {
      color: #000000 !important;
    }
  }
  
  /* ========== ESTILOS BASE (PANTALLA Y PRINT) ========== */
  body {
    font-family: 'Consolas', 'Courier New', 'Monaco', monospace;
    font-size: 11px;
    line-height: 1.4;
    padding: 8px;
    width: ${paperWidth};
    max-width: ${paperWidth};
    margin: 0;
    background: #ffffff;
    color: #000000;
  }
  
  .ticket-container {
    width: ${paperWidth};
    max-width: ${paperWidth};
    min-width: ${paperWidth};
    background: #ffffff;
    margin: 0;
    padding: 0;
  }
  
  /* HEADER - Logo o Nombre de Empresa */
  .logo-container { 
    text-align: center; 
    margin-bottom: 8px; 
    padding-bottom: 8px; 
    border-bottom: 1px dashed #000000; 
  }
  .logo-container img { 
    max-height: 50px; 
    max-width: 60mm; 
    object-fit: contain; 
  }
  .company-name-fallback {
    font-size: 16px;
    font-weight: bold;
    text-align: center;
    padding: 10px 0;
    border-bottom: 1px dashed #000000;
    margin-bottom: 8px;
  }
  
  .header-text { 
    text-align: center; 
    white-space: pre-wrap; 
    margin-bottom: 8px; 
    padding-bottom: 8px; 
    border-bottom: 1px dashed #000000; 
    font-size: 10px; 
    color: #000000; 
  }
  
  /* TÍTULO DEL TICKET */
  .ticket-title { 
    text-align: center; 
    font-weight: bold; 
    font-size: 14px; 
    margin: 10px 0; 
    padding: 6px 0; 
    border: 2px solid #000000;
    color: #000000;
    letter-spacing: 1px;
  }
  
  /* NÚMERO DE OPERACIÓN */
  .operation-number-box { 
    font-family: monospace; 
    font-size: 14px; 
    font-weight: bold;
    text-align: center;
    padding: 8px;
    background: #f0f0f0;
    border: 1px solid #000000;
    margin: 8px 0;
  }
  
  /* FILAS DE INFORMACIÓN */
  .info-row { 
    display: flex; 
    justify-content: space-between; 
    margin-bottom: 4px; 
    page-break-inside: avoid; 
    color: #000000; 
  }
  .info-row .label { font-weight: normal; color: #000000; }
  .info-row .value { font-weight: bold; text-align: right; max-width: 55%; color: #000000; }
  
  /* SECCIONES */
  .section { 
    margin: 10px 0; 
    padding: 10px 0; 
    border-top: 1px dashed #000000; 
    border-bottom: 1px dashed #000000; 
    page-break-inside: avoid; 
  }
  .section-title, .block-title { 
    font-weight: bold; 
    font-size: 11px;
    text-transform: uppercase;
    margin-bottom: 6px; 
    color: #000000;
    letter-spacing: 0.5px;
  }
  
  /* BLOQUES */
  .block { margin: 10px 0; page-break-inside: avoid; }
  .row { display: flex; justify-content: space-between; margin: 4px 0; color: #000000; }
  .row-value { font-weight: bold; color: #000000; }
  
  /* FILAS DE ARTÍCULOS */
  .item-row { 
    display: flex; 
    justify-content: space-between; 
    margin: 4px 0; 
    font-size: 10px; 
    page-break-inside: avoid; 
    color: #000000; 
  }
  .item-name { max-width: 65%; overflow: hidden; text-overflow: ellipsis; color: #000000; }
  .item-price { font-weight: bold; color: #000000; }
  
  /* SECCIÓN TOTAL */
  .total-section { 
    margin-top: 10px; 
    padding-top: 10px; 
    border-top: 2px double #000000; 
    page-break-inside: avoid; 
  }
  .total-row { 
    display: flex; 
    justify-content: space-between; 
    font-weight: bold; 
    font-size: 14px; 
    color: #000000; 
  }
  
  /* CAJA DE IMPORTE DESTACADO */
  .amount-box {
    text-align: center;
    padding: 12px;
    margin: 10px 0;
    border: 2px solid #000000;
  }
  .amount-label { font-size: 10px; color: #666666; margin-bottom: 4px; }
  .amount-value { font-size: 20px; font-weight: bold; color: #000000; }
  
  /* CAJA DE RESULTADO (CIERRE) */
  .result-box {
    border: 2px solid #000000;
    padding: 10px;
    margin: 10px 0;
    text-align: center;
  }
  .result-label { font-size: 10px; margin-bottom: 4px; color: #000000; }
  .result-value { font-size: 16px; font-weight: bold; color: #000000; }
  
  /* HIGHLIGHT BOX */
  .highlight-box {
    background: #f0f0f0;
    padding: 8px;
    margin: 8px 0;
    border: 1px solid #000000;
  }
  
  /* NOTAS IVA */
  .vat-note { text-align: center; font-size: 9px; color: #000000; margin-top: 4px; }
  .vat-breakdown { margin: 6px 0; font-size: 10px; color: #000000; }
  
  /* RANGO DE FECHAS */
  .date-range { 
    background: #f0f0f0; 
    padding: 6px; 
    border-radius: 4px; 
    margin: 8px 0; 
    text-align: center; 
    font-size: 10px; 
    color: #000000;
    border: 1px solid #000000;
  }
  .date-range strong { font-size: 11px; color: #000000; }
  
  /* SEPARADORES */
  .separator { border: none; border-top: 1px dashed #000000; margin: 10px 0; }
  .separator-double { border: none; border-top: 2px solid #000000; margin: 10px 0; }
  
  /* FOOTER */
  .footer-text { 
    text-align: center; 
    white-space: pre-wrap; 
    margin-top: 12px; 
    padding-top: 10px; 
    border-top: 1px dashed #000000; 
    font-size: 10px; 
    color: #000000; 
  }
  
  /* TÉRMINOS LEGALES */
  .terms-text { 
    text-align: center; 
    font-size: 8px; 
    color: #000000; 
    margin-top: 10px; 
    padding-top: 8px; 
    border-top: 1px dashed #000000; 
  }
  
  /* BOTÓN IMPRIMIR */
  .print-btn { 
    display: block; 
    width: 100%; 
    padding: 12px; 
    margin-top: 15px; 
    background: #2563eb; 
    color: white; 
    border: none; 
    font-size: 14px; 
    font-weight: bold; 
    cursor: pointer; 
    border-radius: 4px;
  }
  .print-btn:hover { background: #1d4ed8; }
`;

// ============================================================================
// UTILIDADES
// ============================================================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr) {
  if (!dateStr) return '-';
  try {
    if (dateStr.includes('T')) {
      return dateStr.split('T')[1]?.substring(0, 5) || '-';
    }
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
}

// ============================================================================
// TRADUCCIONES
// ============================================================================
const getTranslations = (language = 'es') => {
  const translations = {
    es: {
      print: 'IMPRIMIR',
      date: 'Fecha',
      time: 'Hora',
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
      saleTicket: 'TICKET DE VENTA',
      expenseTicket: 'TICKET DE SALIDA',
      refund: 'Devolución',
      supplement: 'Suplemento',
      adjustment: 'Ajuste',
      income: 'Ingresos',
      expense: 'Salidas',
      balance: 'Balance',
      returned: 'Devuelto',
      changed: 'Cambiado',
      category: 'Categoría',
      concept: 'Concepto',
      notes: 'Notas',
      amountCharged: 'IMPORTE COBRADO',
      amountRefunded: 'IMPORTE ABONADO',
      amountExpense: 'IMPORTE DE SALIDA',
      shift: 'Turno',
      printedAt: 'Impreso',
      responsible: 'Responsable',
      economicSummary: 'RESUMEN ECONÓMICO',
      openingBalance: 'Fondo Caja Inicial',
      sales: 'Ventas',
      refunds: 'Devoluciones',
      netIncome: 'INGRESO NETO',
      cashAudit: 'ARQUEO DE CAJA',
      expectedCash: 'Efectivo Esperado',
      countedCash: 'Efectivo Contado',
      expectedCard: 'Tarjeta Esperado',
      countedCard: 'Tarjeta Contado',
      discrepancy: 'Descuadre',
      statistics: 'ESTADÍSTICAS',
      operations: 'Operaciones',
      finalResult: 'RESULTADO FINAL',
      totalDiscrepancy: 'DESCUADRE TOTAL'
    },
    en: {
      print: 'PRINT',
      date: 'Date',
      time: 'Time',
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
      saleTicket: 'SALE TICKET',
      expenseTicket: 'EXPENSE TICKET',
      refund: 'Refund',
      supplement: 'Supplement',
      adjustment: 'Adjustment',
      income: 'Income',
      expense: 'Expense',
      balance: 'Balance',
      returned: 'Returned',
      changed: 'Changed',
      category: 'Category',
      concept: 'Concept',
      notes: 'Notes',
      amountCharged: 'AMOUNT CHARGED',
      amountRefunded: 'AMOUNT REFUNDED',
      amountExpense: 'EXPENSE AMOUNT',
      shift: 'Shift',
      printedAt: 'Printed',
      responsible: 'Responsible',
      economicSummary: 'ECONOMIC SUMMARY',
      openingBalance: 'Opening Balance',
      sales: 'Sales',
      refunds: 'Refunds',
      netIncome: 'NET INCOME',
      cashAudit: 'CASH AUDIT',
      expectedCash: 'Expected Cash',
      countedCash: 'Counted Cash',
      expectedCard: 'Expected Card',
      countedCard: 'Counted Card',
      discrepancy: 'Discrepancy',
      statistics: 'STATISTICS',
      operations: 'Operations',
      finalResult: 'FINAL RESULT',
      totalDiscrepancy: 'TOTAL DISCREPANCY'
    }
  };
  return translations[language] || translations.es;
};

// ============================================================================
// OBTENER CONFIGURACIÓN DESDE LOCALSTORAGE
// ============================================================================
export function getStoredSettings() {
  try {
    return {
      companyLogo: localStorage.getItem('company_logo') || localStorage.getItem('companyLogo') || null,
      ticketHeader: localStorage.getItem('ticket_header') || localStorage.getItem('ticketHeader') || 'TIENDA DE ALQUILER DE ESQUÍ',
      ticketFooter: localStorage.getItem('ticket_footer') || localStorage.getItem('ticketFooter') || '¡Gracias por su visita!',
      ticketTerms: localStorage.getItem('ticket_terms') || localStorage.getItem('ticketTerms') || '',
      showDniOnTicket: localStorage.getItem('show_dni_on_ticket') !== 'false',
      showVatOnTicket: localStorage.getItem('show_vat_on_ticket') === 'true',
      defaultVat: parseFloat(localStorage.getItem('default_vat')) || 21,
      vatIncludedInPrices: localStorage.getItem('vat_included_in_prices') !== 'false',
      language: localStorage.getItem('language') || 'es',
      paperWidth: localStorage.getItem('paper_width') || '80mm',
      autoPrintOnPayment: localStorage.getItem('auto_print_on_payment') === 'true',
      printDoubleCopy: localStorage.getItem('print_double_copy') === 'true'
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
      language: 'es',
      paperWidth: '80mm',
      autoPrintOnPayment: false,
      printDoubleCopy: false
    };
  }
}

// ============================================================================
// RENDER HEADER (Logo o Nombre de Empresa como Fallback)
// ============================================================================
function renderHeader(settings) {
  const { companyLogo, ticketHeader } = settings;
  
  // Si hay logo, mostrarlo
  if (companyLogo) {
    return `
      <div class="logo-container">
        <img src="${companyLogo}" alt="Logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
        <div class="company-name-fallback" style="display: none;">${escapeHtml(ticketHeader.split('\\n')[0] || 'MI EMPRESA')}</div>
      </div>
      ${ticketHeader ? `<div class="header-text">${escapeHtml(ticketHeader)}</div>` : ''}
    `;
  }
  
  // Fallback: Mostrar nombre de empresa en texto grande
  const companyName = ticketHeader ? ticketHeader.split('\n')[0] : 'MI EMPRESA';
  const restOfHeader = ticketHeader ? ticketHeader.split('\n').slice(1).join('\n') : '';
  
  return `
    <div class="company-name-fallback">${escapeHtml(companyName)}</div>
    ${restOfHeader ? `<div class="header-text">${escapeHtml(restOfHeader)}</div>` : ''}
  `;
}

// ============================================================================
// RENDER FOOTER
// ============================================================================
function renderFooter(settings) {
  const { ticketFooter, ticketTerms } = settings;
  let html = '';
  
  if (ticketFooter) {
    html += `<div class="footer-text">${escapeHtml(ticketFooter)}</div>`;
  }
  
  if (ticketTerms) {
    html += `<div class="terms-text">${escapeHtml(ticketTerms)}</div>`;
  }
  
  return html;
}

// ============================================================================
// CALCULAR IVA
// ============================================================================
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

// ============================================================================
// RENDER BODY - SEGÚN TIPO DE TICKET
// ============================================================================

// RENTAL - Ticket de Alquiler
function renderRentalBody(data, settings, t) {
  const { showDniOnTicket, showVatOnTicket, defaultVat, vatIncludedInPrices } = settings;
  const vatInfo = calculateVatInfo(data.total || 0, defaultVat, vatIncludedInPrices);
  
  const paymentMethodLabel = (data.paymentMethod === 'efectivo' || data.paymentMethod === 'cash') 
    ? t.cash : t.card;

  // Calcular días si no viene directamente
  let rentalDays = data.days;
  if (!rentalDays && data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    rentalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }
  rentalDays = rentalDays || 1;

  // Renderizar items con 3 columnas: ARTÍCULO | DÍAS | IMPORTE
  const renderItems = () => {
    const items = data.items || [];
    if (items.length === 0) {
      return '<div style="color: #666; font-style: italic; text-align: center; padding: 10px;">Sin artículos detallados</div>';
    }
    
    return `
      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr style="border-bottom: 1px solid #000;">
            <th style="text-align: left; padding: 4px 0; font-weight: bold;">CONCEPTO</th>
            <th style="text-align: center; padding: 4px 0; font-weight: bold; width: 50px;">DÍAS</th>
            <th style="text-align: right; padding: 4px 0; font-weight: bold; width: 60px;">IMPORTE</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => {
            // Construir nombre del artículo con talla si existe
            let itemName = item.name || item.item_type || 'Artículo';
            if (item.size) {
              itemName += ` (${item.size})`;
            }
            // Días del item (individual o global)
            const itemDays = item.days || rentalDays;
            // Importe del item
            const itemPrice = item.price || item.subtotal || 0;
            
            return `
              <tr style="page-break-inside: avoid;">
                <td style="text-align: left; padding: 4px 0; max-width: 100px; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(itemName)}
                  ${item.internal_code ? `<br/><span style="font-size: 8px; color: #666;">${escapeHtml(item.internal_code)}</span>` : ''}
                </td>
                <td style="text-align: center; padding: 4px 0;">${itemDays} ${itemDays === 1 ? t.day : t.days}</td>
                <td style="text-align: right; padding: 4px 0; font-weight: bold;">€${itemPrice.toFixed(2)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  };

  return `
    ${data.operationNumber ? `
      <div class="operation-number-box">Nº ${escapeHtml(data.operationNumber)}</div>
    ` : ''}
    
    <div class="info-row">
      <span class="label">${t.date}:</span>
      <span class="value">${formatDate(data.date)}</span>
    </div>
    
    <div class="info-row">
      <span class="label">${t.customer}:</span>
      <span class="value">${escapeHtml(data.customer || data.customerName || '-')}</span>
    </div>
    
    ${showDniOnTicket && data.dni ? `
      <div class="info-row">
        <span class="label">${t.dni}:</span>
        <span class="value">${escapeHtml(data.dni)}</span>
      </div>
    ` : ''}
    
    ${data.startDate && data.endDate ? `
      <div class="date-range">
        <strong>${t.dateRange}</strong><br/>
        ${t.from}: ${formatDate(data.startDate)} - ${t.to}: ${formatDate(data.endDate)}<br/>
        <strong>(${rentalDays} ${rentalDays === 1 ? t.day : t.days})</strong>
      </div>
    ` : ''}
    
    <div class="section">
      <div class="section-title">${t.items}:</div>
      ${renderItems()}
    </div>
    
    ${showVatOnTicket ? `
      <div class="vat-breakdown">
        <div class="info-row">
          <span class="label">${t.subtotal}:</span>
          <span class="value">€${vatInfo.base.toFixed(2)}</span>
        </div>
        <div class="info-row">
          <span class="label">${t.vat} (${defaultVat}%):</span>
          <span class="value">€${vatInfo.vat.toFixed(2)}</span>
        </div>
      </div>
    ` : ''}
    
    <div class="total-section">
      <div class="total-row">
        <span>${t.total}:</span>
        <span>€${(data.total || 0).toFixed(2)}</span>
      </div>
      ${!showVatOnTicket && vatIncludedInPrices ? `<div class="vat-note">(${t.vatIncluded})</div>` : ''}
    </div>
    
    <div class="info-row" style="margin-top: 10px;">
      <span class="label">${t.paymentMethod}:</span>
      <span class="value">${paymentMethodLabel}</span>
    </div>
  `;
}

// MOVEMENT - Ticket de Movimiento de Caja (Venta, Gasto, Devolución)
function renderMovementBody(data, settings, t) {
  const isRefund = data.movementType === 'refund';
  const isExpense = data.movementType === 'expense';
  const isIncome = data.movementType === 'income' || data.movementType === 'rental';
  
  const amountLabel = isRefund ? t.amountRefunded : isExpense ? t.amountExpense : t.amountCharged;
  const amountPrefix = isIncome ? '+' : '-';
  
  const paymentMethodLabel = (data.paymentMethod === 'efectivo' || data.paymentMethod === 'cash') 
    ? t.cash : t.card;

  return `
    ${data.operationNumber ? `
      <div class="operation-number-box">Nº ${escapeHtml(data.operationNumber)}</div>
    ` : ''}
    
    <hr class="separator" />
    
    <div class="block">
      <div class="block-title">A. ${t.date} y ${t.time}</div>
      <div class="row">
        <span>${t.date}:</span>
        <span class="row-value">${formatDate(data.date || data.createdAt)}</span>
      </div>
      <div class="row">
        <span>${t.time}:</span>
        <span class="row-value">${formatTime(data.date || data.createdAt)}</span>
      </div>
      <div class="row">
        <span>${t.category}:</span>
        <span class="row-value">${escapeHtml(data.categoryLabel || data.category || '-')}</span>
      </div>
      <div class="row">
        <span>${t.paymentMethod}:</span>
        <span class="row-value">${paymentMethodLabel}</span>
      </div>
      ${data.customerName ? `
        <div class="row">
          <span>${t.customer}:</span>
          <span class="row-value">${escapeHtml(data.customerName)}</span>
        </div>
      ` : ''}
    </div>
    
    <hr class="separator" />
    
    <div class="block">
      <div class="block-title">B. ${t.concept}</div>
      <div class="highlight-box">
        ${escapeHtml(data.concept || '-')}
      </div>
      ${data.notes ? `
        <div style="margin-top: 6px; font-size: 10px;">
          ${t.notes}: ${escapeHtml(data.notes)}
        </div>
      ` : ''}
    </div>
    
    <hr class="separator" />
    
    <div class="amount-box">
      <div class="amount-label">${amountLabel}</div>
      <div class="amount-value">${amountPrefix}€${Math.abs(data.amount || 0).toFixed(2)}</div>
    </div>
  `;
}

// CLOSING - Cierre de Caja
function renderClosingBody(data, settings, t) {
  const fmt = (v) => (v || 0).toFixed(2);
  const printTime = new Date().toLocaleString('es-ES', { 
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  return `
    <div class="info-row">
      <span class="label">${t.date}:</span>
      <span class="value">${escapeHtml(data.date)}</span>
    </div>
    <div class="info-row">
      <span class="label">${t.shift}:</span>
      <span class="value">#${data.closureNumber || data.shiftNumber || 1}</span>
    </div>
    <div class="info-row">
      <span class="label">${t.printedAt}:</span>
      <span class="value">${printTime}</span>
    </div>
    ${data.closedBy ? `
      <div class="info-row">
        <span class="label">${t.responsible}:</span>
        <span class="value">${escapeHtml(data.closedBy)}</span>
      </div>
    ` : ''}
    
    <hr class="separator-double" />
    
    <!-- BLOQUE A: RESUMEN ECONÓMICO -->
    <div class="block">
      <div class="block-title">A. ${t.economicSummary}</div>
      <div class="row">
        <span>(+) ${t.openingBalance}:</span>
        <span class="row-value">€${fmt(data.openingBalance)}</span>
      </div>
      <div class="row">
        <span>(+) ${t.sales}:</span>
        <span class="row-value">€${fmt(data.totalIncome || data.ingresosBrutos)}</span>
      </div>
      <div class="row">
        <span>(-) ${t.refunds}:</span>
        <span class="row-value">€${fmt(data.totalRefunds || data.devoluciones)}</span>
      </div>
      <div class="row">
        <span>(-) ${t.expense}:</span>
        <span class="row-value">€${fmt(data.totalExpense || data.gastos)}</span>
      </div>
      <div class="highlight-box" style="margin-top: 8px;">
        <div class="row" style="font-weight: bold;">
          <span>= ${t.netIncome}:</span>
          <span class="row-value">€${fmt(data.netIncome || data.balanceNeto)}</span>
        </div>
      </div>
    </div>
    
    <hr class="separator" />
    
    <!-- BLOQUE B: ARQUEO DE CAJA -->
    <div class="block">
      <div class="block-title">B. ${t.cashAudit}</div>
      
      <div style="margin-bottom: 8px; padding: 6px; border-left: 3px solid #000000;">
        <div style="font-weight: bold; margin-bottom: 4px;">${t.cash}</div>
        <div class="row" style="font-size: 10px;">
          <span>${t.expectedCash}:</span>
          <span>€${fmt(data.expectedCash || data.efectivoEsperado)}</span>
        </div>
        <div class="row" style="font-size: 10px;">
          <span>${t.countedCash}:</span>
          <span>€${fmt(data.countedCash || data.physicalCash)}</span>
        </div>
        <div class="row" style="font-size: 10px; font-weight: bold;">
          <span>${t.discrepancy}:</span>
          <span>€${fmt(data.discrepancyCash)}</span>
        </div>
      </div>
      
      <div style="padding: 6px; border-left: 3px solid #000000;">
        <div style="font-weight: bold; margin-bottom: 4px;">${t.card}</div>
        <div class="row" style="font-size: 10px;">
          <span>${t.expectedCard}:</span>
          <span>€${fmt(data.expectedCard || data.tarjetaEsperada)}</span>
        </div>
        <div class="row" style="font-size: 10px;">
          <span>${t.countedCard}:</span>
          <span>€${fmt(data.countedCard || data.cardTotal)}</span>
        </div>
        <div class="row" style="font-size: 10px; font-weight: bold;">
          <span>${t.discrepancy}:</span>
          <span>€${fmt(data.discrepancyCard)}</span>
        </div>
      </div>
    </div>
    
    <hr class="separator" />
    
    <!-- BLOQUE C: ESTADÍSTICAS -->
    ${data.totalOperations !== undefined ? `
      <div class="block">
        <div class="block-title">C. ${t.statistics}</div>
        <div class="row">
          <span>${t.operations}:</span>
          <span class="row-value">${data.totalOperations || 0}</span>
        </div>
      </div>
      <hr class="separator" />
    ` : ''}
    
    <!-- RESULTADO FINAL -->
    <div class="result-box">
      <div class="result-label">${t.finalResult}: ${t.totalDiscrepancy}</div>
      <div class="result-value">€${fmt(data.discrepancyTotal)}</div>
    </div>
  `;
}

// RETURN - Ticket de Devolución
function renderReturnBody(data, settings, t) {
  const { showDniOnTicket } = settings;
  
  return `
    ${data.operationNumber ? `
      <div class="operation-number-box">Nº ${escapeHtml(data.operationNumber)}</div>
    ` : ''}
    
    <div class="info-row">
      <span class="label">${t.date}:</span>
      <span class="value">${formatDate(data.date)}</span>
    </div>
    
    <div class="info-row">
      <span class="label">${t.customer}:</span>
      <span class="value">${escapeHtml(data.customer)}</span>
    </div>
    
    ${showDniOnTicket && data.dni ? `
      <div class="info-row">
        <span class="label">${t.dni}:</span>
        <span class="value">${escapeHtml(data.dni)}</span>
      </div>
    ` : ''}
    
    <div class="section">
      <div class="section-title">${t.returned}:</div>
      ${(data.returnedItems || []).map(item => `
        <div class="item-row">
          <span class="item-name">${escapeHtml(item.name || item.item_type || 'Artículo')}</span>
          <span class="item-price">${item.days || '-'} ${t.days}</span>
        </div>
      `).join('')}
    </div>
    
    <div class="total-section">
      <div class="total-row">
        <span>${(data.refundAmount || 0) >= 0 ? t.refund : t.supplement}:</span>
        <span>€${Math.abs(data.refundAmount || 0).toFixed(2)}</span>
      </div>
    </div>
  `;
}

// SWAP - Ticket de Cambio/Regularización
function renderSwapBody(data, settings, t) {
  const { showDniOnTicket } = settings;
  const paymentMethodLabel = (data.paymentMethod === 'efectivo' || data.paymentMethod === 'cash') 
    ? t.cash : t.card;
  
  return `
    ${data.operationNumber ? `
      <div class="operation-number-box">Nº ${escapeHtml(data.operationNumber)}</div>
    ` : ''}
    
    <div class="info-row">
      <span class="label">${t.date}:</span>
      <span class="value">${formatDateTime(data.date)}</span>
    </div>
    
    <div class="info-row">
      <span class="label">${t.customer}:</span>
      <span class="value">${escapeHtml(data.customer)}</span>
    </div>
    
    ${showDniOnTicket && data.dni ? `
      <div class="info-row">
        <span class="label">${t.dni}:</span>
        <span class="value">${escapeHtml(data.dni)}</span>
      </div>
    ` : ''}
    
    ${data.contractId ? `
      <div class="info-row">
        <span class="label">Contrato:</span>
        <span class="value">#${escapeHtml(data.contractId.substring(0, 8))}</span>
      </div>
    ` : ''}
    
    ${(data.oldItems || []).length > 0 ? `
      <div class="section">
        <div class="section-title">❌ ${t.returned}:</div>
        ${data.oldItems.map(item => `
          <div class="item-row">
            <span class="item-name">${escapeHtml(item.name || item.item_type || 'Artículo')}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}
    
    ${(data.newItems || []).length > 0 ? `
      <div class="section">
        <div class="section-title">✓ ${t.changed}:</div>
        ${data.newItems.map(item => `
          <div class="item-row">
            <span class="item-name">${escapeHtml(item.name || item.item_type || 'Artículo')}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}
    
    ${data.dateAdjustment ? `
      <div class="section">
        <div class="section-title">📅 ${t.adjustment} de Fecha:</div>
        <div class="row">
          <span>Días originales:</span>
          <span class="row-value">${data.originalDays || '-'}</span>
        </div>
        <div class="row">
          <span>Días nuevos:</span>
          <span class="row-value">${data.newDays || '-'}</span>
        </div>
        <div class="row">
          <span>Diferencia:</span>
          <span class="row-value">${data.daysDelta > 0 ? '+' : ''}${data.daysDelta || 0} días</span>
        </div>
      </div>
    ` : ''}
    
    <div class="total-section">
      <div class="total-row">
        <span>${(data.difference || 0) >= 0 ? t.supplement : t.refund}:</span>
        <span>€${Math.abs(data.difference || 0).toFixed(2)}</span>
      </div>
    </div>
    
    ${(data.difference || 0) !== 0 ? `
      <div class="info-row" style="margin-top: 10px;">
        <span class="label">${t.paymentMethod}:</span>
        <span class="value">${paymentMethodLabel}</span>
      </div>
    ` : ''}
  `;
}

// ============================================================================
// OBTENER TÍTULO DEL TICKET
// ============================================================================
function getTicketTitle(ticketType, data, t) {
  switch (ticketType) {
    case 'rental':
      return t.rentalTicket;
    case 'return':
      return t.returnTicket;
    case 'swap':
      return t.swapTicket;
    case 'movement':
      // Determinar tipo específico de movimiento
      if (data.movementType === 'refund') return t.returnTicket;
      if (data.movementType === 'expense') return t.expenseTicket;
      return t.saleTicket;
    case 'closing':
      return t.closingTicket;
    default:
      return t.movementTicket;
  }
}

// ============================================================================
// FUNCIÓN PRINCIPAL - GENERAR HTML DEL TICKET
// ============================================================================
export function generateTicketHTML(options) {
  const { ticketType, data, settings: providedSettings } = options;
  
  // Obtener configuración (proporcionada o desde localStorage)
  const settings = providedSettings || getStoredSettings();
  const { language, paperWidth } = settings;
  
  // Traducciones
  const t = getTranslations(language);
  
  // Título del ticket
  const ticketTitle = getTicketTitle(ticketType, data, t);
  
  // Renderizar cuerpo según tipo
  let bodyHTML = '';
  switch (ticketType) {
    case 'rental':
      bodyHTML = renderRentalBody(data, settings, t);
      break;
    case 'return':
      bodyHTML = renderReturnBody(data, settings, t);
      break;
    case 'swap':
      bodyHTML = renderSwapBody(data, settings, t);
      break;
    case 'movement':
      bodyHTML = renderMovementBody(data, settings, t);
      break;
    case 'closing':
      bodyHTML = renderClosingBody(data, settings, t);
      break;
    default:
      bodyHTML = renderMovementBody(data, settings, t);
  }
  
  // Construir HTML completo
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${ticketTitle}</title>
      <style>${getMasterCSS(paperWidth)}</style>
    </head>
    <body>
      <div class="ticket-container">
        ${renderHeader(settings)}
        <div class="ticket-title">${ticketTitle}</div>
        ${bodyHTML}
        ${renderFooter(settings)}
      </div>
      <button class="print-btn" onclick="window.print(); setTimeout(() => window.close(), 500);">${t.print}</button>
    </body>
    </html>
  `;
}

// ============================================================================
// FUNCIÓN PARA IMPRIMIR TICKET - SISTEMA AGNÓSTICO
// ============================================================================
// Usa los drivers del sistema operativo a través del navegador.
// NO requiere configuración de IP ni WebUSB.
// Funciona con cualquier impresora marcada como "Predeterminada" en el sistema.
// ============================================================================

export function printTicket(options) {
  const html = generateTicketHTML(options);
  const settings = options.settings || getStoredSettings();
  
  // Método 1: IFRAME OCULTO (Preferido - Sin ventanas popup)
  // Crea un iframe invisible, carga el contenido, imprime y se limpia
  return printViaIframe(html, settings);
}

/**
 * Imprime usando un iframe oculto (método más limpio)
 * - No abre ventanas popup
 * - Auto-imprime al cargar
 * - Se limpia automáticamente después
 */
function printViaIframe(html, settings) {
  return new Promise((resolve) => {
    // Crear iframe oculto
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:none;left:-9999px;top:-9999px;';
    iframe.id = 'print-frame-' + Date.now();
    
    // Función de limpieza
    const cleanup = () => {
      setTimeout(() => {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1000); // Pequeño delay para asegurar que la impresión terminó
    };
    
    // Cuando el iframe carga el contenido
    iframe.onload = () => {
      try {
        const iframeWindow = iframe.contentWindow;
        
        // Esperar a que el contenido esté completamente renderizado
        setTimeout(() => {
          try {
            // Llamar a window.print() del iframe
            iframeWindow.print();
            
            // Si hay doble copia, imprimir de nuevo después de un delay
            if (settings.printDoubleCopy) {
              setTimeout(() => {
                try {
                  iframeWindow.print();
                } catch (e) {
                  console.warn('[Print] Error en segunda copia:', e);
                }
                cleanup();
                resolve(true);
              }, 2000);
            } else {
              cleanup();
              resolve(true);
            }
          } catch (printError) {
            console.error('[Print] Error al imprimir:', printError);
            // Fallback: Abrir en nueva ventana
            printViaPopup(html, settings);
            cleanup();
            resolve(true);
          }
        }, 100); // 100ms para renderizar
        
      } catch (e) {
        console.error('[Print] Error en iframe:', e);
        cleanup();
        resolve(false);
      }
    };
    
    // Añadir iframe al DOM
    document.body.appendChild(iframe);
    
    // Escribir contenido en el iframe (sin botón de imprimir)
    const printHTML = html.replace(
      /<button class="print-btn"[^>]*>.*?<\/button>/g, 
      '' // Eliminar botón de imprimir (no necesario en modo automático)
    );
    
    try {
      iframe.contentDocument.open();
      iframe.contentDocument.write(printHTML);
      iframe.contentDocument.close();
    } catch (e) {
      console.error('[Print] Error escribiendo en iframe:', e);
      // Fallback a método popup
      printViaPopup(html, settings);
      cleanup();
      resolve(true);
    }
  });
}

/**
 * Imprime usando ventana popup (fallback)
 * - Se usa si el iframe falla
 * - El usuario ve la ventana brevemente
 */
function printViaPopup(html, settings) {
  const printWindow = window.open('', '_blank', 'width=400,height=700,scrollbars=no,menubar=no,toolbar=no,location=no,status=no');
  
  if (!printWindow) {
    console.error('[Print] No se pudo abrir ventana. Permite popups para esta página.');
    alert('No se pudo abrir la ventana de impresión. Por favor, permite los popups para esta página.');
    return false;
  }
  
  // HTML modificado para auto-imprimir y auto-cerrar
  const autoHTML = html.replace(
    '</head>',
    `<script>
      window.onload = function() {
        setTimeout(function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        }, 100);
      };
    </script></head>`
  ).replace(
    /<button class="print-btn"[^>]*>.*?<\/button>/g,
    '' // Eliminar botón manual
  );
  
  printWindow.document.write(autoHTML);
  printWindow.document.close();
  printWindow.focus();
  
  // Doble copia si está configurada
  if (settings.printDoubleCopy) {
    setTimeout(() => {
      const secondWindow = window.open('', '_blank', 'width=400,height=700');
      if (secondWindow) {
        secondWindow.document.write(autoHTML);
        secondWindow.document.close();
        secondWindow.focus();
      }
    }, 2500);
  }
  
  return true;
}

/**
 * Imprime directamente sin preguntar (para modo kiosco)
 * Requiere que el usuario haya configurado su navegador en modo kiosco
 */
export function printTicketSilent(options) {
  return printTicket(options);
}

// ============================================================================
// EXPORTAR TODO
// ============================================================================
export default {
  generateTicketHTML,
  printTicket,
  getStoredSettings
};
