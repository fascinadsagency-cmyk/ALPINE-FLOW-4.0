# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Problema Original
Sistema de gestión completo para tiendas de alquiler de equipos de esquí/snowboard con énfasis en VELOCIDAD y PRECISIÓN.

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + Python
- **Base de datos**: MongoDB
- **Autenticación**: JWT

## Funcionalidades Implementadas

### 1. Módulo de Caja - REDISEÑADO (2026-01-29)
**3 Pestañas principales:**

**A) Caja del Día:**
- Sin límite horario para cerrar caja (siempre disponible)
- Navegación por fechas (anterior/siguiente)
- Tarjetas: Entradas, Salidas, Devoluciones, Efectivo, Tarjeta
- Saldo Neto del Día
- Tabla de movimientos con reimprimir ticket

**B) Cierres Pasados:**
- Histórico completo de cierres
- Columnas: Fecha, Empleado, Esperado/Real Efectivo, Esperado/Real Tarjeta, Descuadre Total
- Botón **Reabrir** para revertir cierres

**C) Histórico Movimientos:**
- Buscador con filtros: Fecha desde/hasta, Tipo de operación, Búsqueda por concepto
- Lista cronológica infinita de movimientos
- Botón **Reimprimir Ticket** en cada movimiento

**Formulario de Cierre (Arqueo Manual):**
- Campo obligatorio: Efectivo Real Contado
- Campo obligatorio: Total Datáfono/Tarjeta
- Cálculo automático de descuadre (Efectivo + Tarjeta)
- Indicador visual: Verde (cuadra), Amarillo (pequeña diferencia), Rojo (descuadre grande)
- Observaciones del cierre

### 2. Rentabilidad en Inventario
- Columnas: Coste, Ingresos, Amortización (barra), Beneficio
- Ordenación por rentabilidad

### 3. Filtro de Estado en Clientes
- Todos / Activos Hoy / Inactivos

### 4. Acceso a Ficha de Cliente
- Nombre clicable en: Devoluciones, Alquileres Activos, Base de Datos

### 5. Modificar Duración de Alquileres
- Flujo de 3 pasos con ajuste financiero

### 6. Packs con Tipos de Artículo Dinámicos (2026-01-29)
- El módulo de Packs/Combos ahora carga tipos de artículo desde el endpoint `/api/item-types`
- Compatible con tipos por defecto (Esquís, Snowboard, Botas, Casco, Bastones)
- Compatible con tipos personalizados creados por el usuario (Snowblade, Trineo, etc.)
- Los precios individuales también muestran todos los tipos dinámicamente

## Próximas Tareas (Backlog)

### P1 - Alta Prioridad
- [ ] Buscador de clientes en Taller Externo (Maintenance.jsx)
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
Versión: 2.6.0

## Changelog
- **v2.6.0** (2026-01-29): Rediseño completo del Módulo de Caja
  - 3 pestañas: Caja del Día, Cierres Pasados, Histórico Movimientos
  - Sin límite horario para cerrar caja
  - Arqueo manual con Efectivo + Tarjeta separados
  - Cálculo de descuadre automático
  - Histórico de movimientos con filtros y reimpresión
  - Botón Reabrir para revertir cierres
- **v2.5.0** (2026-01-29): Rentabilidad en Inventario
- **v2.4.0** (2026-01-29): Filtro de Estado en Clientes
