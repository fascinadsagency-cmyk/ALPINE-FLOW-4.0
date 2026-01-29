# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Problema Original
Sistema de gestión completo para tiendas de alquiler de equipos de esquí/snowboard con énfasis en VELOCIDAD y PRECISIÓN.

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + Python
- **Base de datos**: MongoDB
- **Autenticación**: JWT

## Funcionalidades Implementadas

### 1. Módulo de Rentabilidad en Inventario (NUEVO 2026-01-29)
**Botón "Ver Rentabilidad" activa el modo financiero:**
- ✅ Panel resumen: Artículos, Coste Total, Ingresos Totales, Beneficio Neto, Amortizados
- ✅ Columna **Coste**: Precio de adquisición del artículo
- ✅ Columna **Ingresos**: Suma de todos los alquileres cerrados de ese artículo
- ✅ Columna **Amortización**: 
  - Barra de progreso con colores (rojo <50%, amarillo <80%, verde >80%)
  - Badge "AMORTIZADO" cuando ingresos >= coste
- ✅ Columna **Beneficio Neto**: Ingresos - Coste (verde si positivo, rojo si negativo)
- ✅ **Filtro de ordenación**: Mayor/Menor Beneficio, Más Ingresos, Mayor Amortización

### 2. Filtro de Estado en Clientes
- Todos / Activos Hoy / Inactivos con contadores
- Badge "Activo" y fila resaltada

### 3. Acceso a Ficha de Cliente - Estandarizado
- Nombre clicable en: Devoluciones, Alquileres Activos, Base de Datos de Clientes
- Modal con contacto directo (Llamar, WhatsApp, Email)

### 4. Modificar Duración de Alquileres
- Flujo de 3 pasos con ajuste financiero automático en Caja

### 5. Sistema de Caja
- Impresión de tickets desde movimientos
- Historial de cierres con reversión

### 6. Funcionalidades Base
- Dashboard estratégico con KPIs
- Proceso de Alquiler con Auto-Combo
- Devolución Rápida
- Inventario con código interno
- Tarifas y Packs
- Taller/Mantenimiento

## Próximas Tareas (Backlog)

### P1 - Alta Prioridad
- [ ] Pestaña de Soporte y Mejoras

### P2 - Media Prioridad
- [ ] Integración WhatsApp API
- [ ] Integración TPV bancario
- [ ] Integración VeriFactu

## Credenciales de Prueba
- Usuario: test_combo
- Contraseña: test123456

## Última Actualización
Fecha: 2026-01-29
Versión: 2.5.0

## Changelog
- **v2.5.0** (2026-01-29): Módulo de Rentabilidad en Inventario
  - Nuevo endpoint /api/items/with-profitability
  - Panel resumen con métricas financieras globales
  - Columnas: Coste, Ingresos, Amortización (barra), Beneficio
  - Ordenación por rentabilidad
  - Badge "AMORTIZADO" para artículos que superaron su coste
- **v2.4.0** (2026-01-29): Filtro de Estado en Clientes
- **v2.3.0** (2026-01-29): Nombre clicable en Clientes
