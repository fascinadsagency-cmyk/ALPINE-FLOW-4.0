# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Descripción General
Sistema completo de gestión de alquileres para tiendas de equipos de esquí con soporte multi-tienda.

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: Python FastAPI
- **Base de Datos**: MongoDB

## Funcionalidades Implementadas

### Página "Nuevo Alquiler" (Última actualización: 11/02/2026)
- **Layout de 3 columnas**: Cliente | Duración | Artículos (búsqueda)
- **Artículos Seleccionados**: Ancho completo debajo de las 3 columnas
- **Sistema de Tickets Paralelos (Cuentas Paralelas)**:
  - Barra de pestañas en la parte superior
  - Crear/eliminar tickets con botón +/X
  - Cambiar entre tickets manteniendo estado aislado
  - Persistencia en localStorage (24 horas)
  - Auto-renombrado de pestaña con nombre del cliente
  - Al completar alquiler, cierra ticket y pasa al siguiente
- **Footer fijo de cobro** (margen inferior 23px):
  - Descuento de proveedor (ej: HAPPY SKI -10%)
  - Total
  - Método de pago (dropdown)
  - Importe
  - Depósito
  - Descuento manual (%, €)
  - Contador de artículos
  - Botón "Completar"
- **Navegación Tab**: Cliente → Días → Buscar Artículos → Completar
- **Popup de pago compacto**: Reducido para caber en pantalla al 100%

### Página "Clientes"
- **Filtros**: Todos | Activos Hoy | Inactivos
- **Bug corregido**: Endpoint de estadísticas y lista paginada para super_admin

### Bugs Corregidos (Sesión 11/02/2026)
1. ✅ Integridad financiera con Packs
2. ✅ Flicker en Caja Registradora
3. ✅ Carga lenta de Clientes Activos (optimización con agregación)
4. ✅ Desajuste de conteo de clientes activos
5. ✅ KeyError store_id para super_admin en endpoints de clientes

## Archivos Principales
- `/app/frontend/src/pages/NewRental.jsx` - Página de nuevo alquiler
- `/app/frontend/src/hooks/useMultiTicketPersistence.js` - Hook de tickets paralelos
- `/app/frontend/src/pages/Customers.jsx` - Página de clientes
- `/app/backend/server.py` - Backend API

## Esquema de Base de Datos
- `customers`: {id, dni, name, phone, city, source, store_id, ...}
- `rentals`: {id, customer_id, customer_dni, status, start_date, end_date, store_id, ...}
- `items`: {id, barcode, name, item_type, status, store_id, ...}
- `tariffs`: {id, item_type, prices_by_days, store_id, ...}
- `cash_movements`: {id, amount, type, rental_id, store_id, ...}

## Notas Importantes
- Los precios se calculan según las tarifas configuradas por tipo de artículo
- Artículos sin tarifa muestran €0.00 y "Sin tarifa"
- El sistema es multi-tenant (filtrado por store_id)
- Super_admin puede ver todas las tiendas

## Backlog / Tareas Futuras
- Refactorizar NewRental.jsx (archivo muy grande, +3000 líneas)
- Dividir en componentes más pequeños
