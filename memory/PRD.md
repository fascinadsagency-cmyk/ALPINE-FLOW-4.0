# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Problema Original
Sistema de gestión completo para tiendas de alquiler de equipos de esquí/snowboard con énfasis en VELOCIDAD y PRECISIÓN.

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + Python
- **Base de datos**: MongoDB
- **Autenticación**: JWT

## Funcionalidades Implementadas (MVP + Mejoras)

### 1. Autenticación
- Login/Registro con JWT
- Roles: admin, employee

### 2. Dashboard Estratégico y Analítico
- KPIs en tiempo real (ingresos, alquileres, ocupación, devoluciones)
- **✅ Vista Semanal de Ocupación**:
  - 7 días en columnas con barras por gama (S/A/M)
  - Colores: Verde (alta disp.), Amarillo (pocos), Rojo (crítico)
  - Click en día para ver desglose de entregas/devoluciones
  - Disponibilidad media calculada automáticamente
- **✅ Panel de Rendimiento de Inventario**:
  - "Más Alquilados": Top 5 artículos con más rotación
  - "Más Rentables": Top 5 artículos por ingresos totales
  - Filtro temporal: Hoy / Esta Semana / Este Mes
- **✅ Alerta de Stock Parado**: Artículos sin alquilar en el período
- **✅ Alertas Urgentes**: Devoluciones vencidas + Mantenimiento con navegación rápida
- Ocupación por Gamas (Superior, Alta, Media) con barras de progreso

### 3. Gestión de Clientes (Base de Datos Profesional)
- Búsqueda rápida por DNI/nombre/teléfono
- **Autocompletado inteligente** con búsqueda predictiva
- Historial de alquileres
- Tallas preferidas automáticas
- **Campo de Observaciones/Notas**
- **Alertas de seguridad** (clientes con alquileres vencidos)
- Asociación con proveedores/colaboradores
- **✅ HISTORIAL DE TRANSACCIONES**:
  - Resumen financiero: Total Pagado, Devoluciones, Ingreso Neto
  - Lista cronológica de pagos y reembolsos
  - Referencia al alquiler correspondiente
  - Notas de cada transacción

### 4. Proceso de Alquiler (Optimizado)
- **Sistema de fechas inteligente**:
  - Campo "Número de días" prominente
  - Fecha inicio automática (hoy/mañana según hora 15:00)
  - Botones rápidos 1d, 2d, 3d, 5d, 7d
  - Cálculo bidireccional días ↔ fechas
- Escaneo de artículos por código de barras
- Búsqueda manual de artículos (F3 / Alt+B)
- Sistema de descuentos (%, € fijo, manual)
- **Descuento automático de proveedor**
- Múltiples métodos de pago
- Precios editables por artículo
- **✅ AUTO-COMBO**: Detección automática de packs
  - Detecta cuando los artículos forman un pack configurado
  - Aplica precio del pack automáticamente
  - Muestra badge "Pack Detectado" y "En Pack"
- **✅ SUGERENCIAS INTELIGENTES (Upselling)**:
  - Detecta packs incompletos en tiempo real
  - Muestra mensaje: "Añade [artículo] para completar el pack y ahorrar €X"
  - Botón "Ver Disponibles" abre búsqueda filtrada por tipo y categoría
  - Al completar el pack, la sugerencia desaparece automáticamente
- **✅ VINCULACIÓN CON CAJA**: Genera asiento automático al cobrar
  - Registra: Hora, Cliente, Concepto (Alquiler #ID), Método de Pago, Monto

### 5. Devoluciones Ultra-Rápidas
- Escanear cualquier artículo → encuentra alquiler
- Vista de artículos pendientes vs devueltos
- Alertas de pagos pendientes
- **Auto-actualización** del panel
- **Botones de contacto** rápido
- **✅ REEMBOLSO PARCIAL**: Abono por días no disfrutados
  - Botón "Reembolso Parcial" visible en la ficha del alquiler
  - Calcula automáticamente el precio por día (considerando packs/descuentos)
  - Permite seleccionar días a reembolsar
  - Genera asiento negativo en Caja etiquetado como "Devolución Alquiler #ID"

### 6. Inventario
- **Importación CSV masiva**
- **Exportación a CSV**
- **Generación de códigos de barras** (manual/automática)
- Estados: disponible, alquilado, mantenimiento, baja
- Filtros por tipo y estado
- Contador de días de uso
- Cálculo de amortización
- **Código Interno** personalizable
- **Usos para Mantenimiento** con cálculo automático

### 7. Tarifas
- **Precios individuales** por tipo y duración (day_1 a day_10, day_11_plus)
- **Sistema de Packs/Combos** con precios especiales por día
- Creador visual de packs

### 8. Mantenimiento
- **Alertas automáticas** según días de uso
- Artículos que necesitan mantenimiento AHORA
- Próximos a mantenimiento (< 5 salidas)
- Historial de mantenimientos
- Tipos: afilado, encerado, reparación, inspección

### 9. TALLER EXTERNO (Módulo de Reparaciones)
- **✅ Selector de Modo**: Botones grandes "MI FLOTA" (azul) y "TALLER EXTERNO" (naranja)
- **✅ Contadores visuales**: Badges con número de pendientes en cada modo
- **MI FLOTA**:
  - Lista de equipos propios por usos
  - Botón "PUESTA A PUNTO LISTA" (resetea usos sin cobrar)
  - Alertas de mantenimiento urgente y próximo
- **TALLER EXTERNO**:
  - Formulario con precio MANUAL (sin tarifas fijas)
  - Campo "Descripción del Trabajo" libre
  - Prioridad visual (verde/naranja/rojo con barra lateral)
  - Botón flotante "+ NUEVA REPARACIÓN" (solo en este modo)
  - Tarjetas diferenciadas con estado (pendiente/listo/atrasado)
  - Botón WhatsApp para avisar al cliente
  - **Precio editable en el momento de cobrar** (descuentos/recargos)
  - Integración con Caja como "Servicio Taller"

### 10. Gestión de Caja (FLUJO FINANCIERO COMPLETO)
- **✅ Vinculación automática con Alquileres**: Todo cobro genera asiento
- **✅ Vinculación automática con Taller**: Servicios externos generan asiento
- **✅ Columna Cliente**: Muestra el nombre del cliente en cada movimiento
- **✅ Tarjeta de Devoluciones**: Suma total de reembolsos del día (naranja)
- **✅ Saldo Neto**: Entradas - Salidas - Devoluciones = Dinero real en caja
- Registro de entradas/salidas manuales
- Cierres de caja diarios con arqueo
- Desglose por método de pago
- Exportación a CSV

### 11. Reportes
- Cierre de día con desglose por método de pago
- Lista de devoluciones pendientes
- Porcentaje de ocupación del inventario

### 12. Integraciones (UI preparada)
- **VeriFactu**: Configuración de certificado y credenciales
- **Email SMTP**: Configuración para notificaciones
- **Google Calendar**: Preparado para sincronización

## Próximas Funcionalidades (Backlog)

### P1 - Alta Prioridad
- [ ] **Integraciones - Lógica de Backend**: VeriFactu, Email, Google Calendar
- [ ] **Dashboard - Interactividad**: Botones funcionales en widgets
- [ ] Importación de datos históricos
- [ ] Histórico de pagos con contraseña admin

### P2 - Media Prioridad
- [ ] Integración WhatsApp para avisos
- [ ] Integración TPV bancario
- [ ] Reimprimir tickets de TPV
- [ ] Reservas con calendario visual

### P3 - Baja Prioridad  
- [ ] OCR para escaneo de DNI
- [ ] Generación de PDFs
- [ ] Módulo de Reportes Avanzados

## Credenciales de Prueba
- Usuario: test_combo
- Contraseña: test123456

## Última Actualización
Fecha: 2026-01-28
Versión: 1.8.0

## Changelog
- **v1.8.0** (2026-01-28): ✅ Dashboard Analítico Completo
  - Vista Semanal de Ocupación (7 días con barras por gama)
  - Click en día para desglose de entregas/devoluciones
  - Panel de Rendimiento: "Más Alquilados" y "Más Rentables"
  - Filtro temporal: Hoy / Esta Semana / Este Mes
  - Alerta de Stock Parado
  - Navegación rápida desde alertas urgentes
- **v1.7.0** (2026-01-28): ✅ Módulo Taller Externo completo
  - Selector de modo: "MI FLOTA" (azul) vs "TALLER EXTERNO" (naranja)
  - Precios manuales sin tarifas fijas
  - Precio editable al momento de cobrar
  - Integración con Caja como "Servicio Taller"
- **v1.6.0** (2026-01-28): ✅ Sugerencias Inteligentes de Packs (Upselling)
- **v1.5.0** (2026-01-28): ✅ Historial de Transacciones en ficha de cliente
- **v1.4.0** (2026-01-28): ✅ Flujo Financiero Completo (Alquileres ↔ Caja ↔ Devoluciones)
- **v1.3.0** (2026-01-28): ✅ Auto-Combo implementado
- **v1.2.x** (2026-01-27): Dashboard estratégico, Autocompletado clientes, UI integraciones
