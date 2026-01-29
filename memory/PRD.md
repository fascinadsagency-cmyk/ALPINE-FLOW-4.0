# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Problema Original
Sistema de gestión completo para tiendas de alquiler de equipos de esquí/snowboard con énfasis en VELOCIDAD y PRECISIÓN.

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + Python
- **Base de datos**: MongoDB
- **Autenticación**: JWT

## Funcionalidades Implementadas

### 1. Acceso a Ficha de Cliente desde Devoluciones (NUEVO 2026-01-29)
- ✅ **Nombre clicable**: El nombre del cliente es un enlace interactivo
- ✅ **Modal de Ficha Completa**:
  - Teléfono con botones: **Llamar** y **WhatsApp**
  - Email con botón de envío
  - Hotel/Alojamiento
  - DNI/Pasaporte
- ✅ **Material Pendiente**: Lista de artículos pendientes con código, tipo y talla
- ✅ **WhatsApp con mensaje predefinido**: "Hola [Nombre], te contactamos de la tienda de esquí por la devolución del material..."

### 2. Modificar Duración de Alquileres
- Flujo de 3 pasos obligatorio (días → pago → ticket)
- Soporte para reembolsos (devoluciones)
- Ajuste financiero automático en Caja
- Ticket de modificación/abono

### 3. Sistema de Caja
- Impresión de tickets desde movimientos
- Historial de cierres con reversión
- Vinculación automática con alquileres

### 4. Funcionalidades Base
- Dashboard estratégico con KPIs
- Gestión de Clientes con historial
- Proceso de Alquiler con Auto-Combo
- Devolución Rápida con un clic
- Inventario con código interno
- Tarifas y Packs
- Taller/Mantenimiento

## Próximas Tareas (Backlog)

### P1 - Alta Prioridad
- [ ] Pestaña de Soporte y Mejoras

### P2 - Media Prioridad
- [ ] Integración WhatsApp API (envío automático)
- [ ] Integración TPV bancario
- [ ] Integración VeriFactu

### P3 - Baja Prioridad
- [ ] Sistema de Reservas Online
- [ ] Modo Oscuro

## Credenciales de Prueba
- Usuario: test_combo
- Contraseña: test123456

## Última Actualización
Fecha: 2026-01-29
Versión: 2.1.0

## Changelog
- **v2.1.0** (2026-01-29): Acceso Rápido a Ficha de Cliente
  - Modal de ficha con info de contacto completa
  - Botones de acción directa (Llamar, WhatsApp, Email)
  - Lista de material pendiente en la ficha
  - Mensaje WhatsApp predefinido para recordatorios
- **v2.0.1** (2026-01-29): Corrección flujo de reembolsos
- **v2.0.0** (2026-01-28): Modificar Duración como Transacción Financiera
