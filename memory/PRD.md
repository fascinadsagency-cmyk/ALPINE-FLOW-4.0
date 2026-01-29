# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Problema Original
Sistema de gestión completo para tiendas de alquiler de equipos de esquí/snowboard con énfasis en VELOCIDAD y PRECISIÓN.

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + Python
- **Base de datos**: MongoDB
- **Autenticación**: JWT

## Funcionalidades Implementadas

### 1. Filtro de Estado en Base de Datos de Clientes (NUEVO 2026-01-29)
**Selector de filtro con 3 opciones:**
- ✅ **Todos**: Muestra base de datos completa (histórico)
- ✅ **Activos Hoy**: Clientes con alquiler abierto actualmente
- ✅ **Inactivos**: Clientes sin material alquilado

**Características:**
- Contador dinámico al lado de cada opción (ej: Activos Hoy (2))
- Filtrado instantáneo sin recarga
- Integración con búsqueda (buscar dentro del filtro seleccionado)
- Indicador visual "Activo" badge verde en la tabla
- Filas de clientes activos con fondo verde suave

### 2. Acceso a Ficha de Cliente - Estandarizado
**Disponible en:** Devoluciones, Alquileres Activos, Base de Datos
- Nombre clicable → Modal de ficha completa
- Botones: Llamar, WhatsApp, Email
- Historial de alquileres y pagos

### 3. Modificar Duración de Alquileres
- Flujo de 3 pasos (días → pago → ticket)
- Soporte para reembolsos
- Ajuste financiero automático en Caja

### 4. Sistema de Caja
- Impresión de tickets desde movimientos
- Historial de cierres con reversión

### 5. Funcionalidades Base
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
Versión: 2.4.0

## Changelog
- **v2.4.0** (2026-01-29): Filtro de Estado en Clientes
  - Nuevo endpoint /api/customers/with-status
  - Botones: Todos, Activos Hoy, Inactivos con contadores
  - Badge "Activo" en tabla para clientes con alquiler
  - Filtrado instantáneo combinado con búsqueda
- **v2.3.0** (2026-01-29): Nombre clicable en Clientes
- **v2.2.0** (2026-01-29): Ficha de Cliente en Alquileres Activos
- **v2.1.0** (2026-01-29): Ficha de Cliente en Devoluciones
