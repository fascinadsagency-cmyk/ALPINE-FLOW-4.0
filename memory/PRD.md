# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Problema Original
Sistema de gestión completo para tiendas de alquiler de equipos de esquí/snowboard con énfasis en VELOCIDAD y PRECISIÓN.

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + Python
- **Base de datos**: MongoDB
- **Autenticación**: JWT

## Funcionalidades Implementadas

### 1. Acceso a Ficha de Cliente (ACTUALIZADO 2026-01-29)
**Disponible en:**
- ✅ **Devoluciones Pendientes**: Nombre clicable + botón "Ficha"
- ✅ **Alquileres Activos**: Nombre clicable + icono 👤

**Modal de Ficha incluye:**
- Teléfono con botones **Llamar** y **WhatsApp**
- Email con botón de envío
- Hotel/Alojamiento
- DNI/Pasaporte
- Artículos alquilados con estado (Activo/Devuelto)
- Resumen del alquiler (días, importe)
- Observaciones
- WhatsApp con mensaje predefinido

### 2. Modificar Duración de Alquileres
- Flujo de 3 pasos (días → pago → ticket)
- Soporte para reembolsos
- Ajuste financiero automático en Caja

### 3. Sistema de Caja
- Impresión de tickets desde movimientos
- Historial de cierres con reversión

### 4. Funcionalidades Base
- Dashboard estratégico con KPIs
- Gestión de Clientes con historial
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
Versión: 2.2.0

## Changelog
- **v2.2.0** (2026-01-29): Ficha de Cliente en Alquileres Activos
  - Nombre del cliente clicable en tabla
  - Icono 👤 en columna de acciones
  - Modal con info completa + artículos alquilados
  - Botones de contacto directo (Llamar, WhatsApp)
- **v2.1.0** (2026-01-29): Ficha de Cliente en Devoluciones
- **v2.0.1** (2026-01-29): Corrección flujo de reembolsos
