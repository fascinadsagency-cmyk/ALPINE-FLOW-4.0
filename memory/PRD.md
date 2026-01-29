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

### 6. Módulo de Packs con Tipos Personalizados (2026-01-29)
- Carga dinámica de tipos de artículo desde `/api/item-types`
- Compatible con tipos por defecto (ski, snowboard, boots, helmet, poles)
- Compatible con tipos personalizados creados por el usuario
- Los packs existentes muestran correctamente los nombres de tipos personalizados

### 7. Buscador de Clientes en Taller Externo (2026-01-29)
- Autocompletado en tiempo real con debounce (300ms)
- Búsqueda por nombre, teléfono o DNI
- Navegación por teclado (↑↓ Enter Escape)
- Muestra: nombre, DNI, ciudad, teléfono
- Opción de crear nuevo cliente desde el mismo diálogo

## Próximas Tareas (Backlog)

### P1 - Alta Prioridad
- [ ] Pestaña de Soporte y Mejoras
- [ ] Finalizar Sistema de Impresión (interruptor auto-impresión)

### P2 - Media Prioridad
- [ ] Integración WhatsApp API
- [ ] Integración TPV bancario
- [ ] Integración VeriFactu
- [ ] Integración Email
- [ ] Integración Google Calendar

### P3 - Baja Prioridad
- [ ] Sistema de Reservas Online
- [ ] Modo Oscuro

## Refactorización Pendiente
- **CRÍTICO**: `/app/backend/server.py` es un monolito de +3000 líneas. Debe descomponerse en módulos (routers, models, services)
- **ALTO**: Páginas grandes de React (CashRegister.jsx, ActiveRentals.jsx, Inventory.jsx, Customers.jsx) deben dividirse en componentes

## Credenciales de Prueba
- Usuario: test_packs_user
- Contraseña: test123456

## Última Actualización
Fecha: 2026-01-29
Versión: 2.7.0

## Changelog
- **v2.7.0** (2026-01-29): 
  - Módulo de Packs compatible con tipos de artículo personalizados
  - Buscador de clientes mejorado en Taller Externo (autocompletado, crear cliente)
- **v2.6.0** (2026-01-29): Rediseño completo del Módulo de Caja
- **v2.5.0** (2026-01-29): Rentabilidad en Inventario
- **v2.4.0** (2026-01-29): Filtro de Estado en Clientes
