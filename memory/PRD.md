# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Descripción General
Sistema completo de gestión de alquileres para tiendas de equipos de esquí con soporte multi-tienda.

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: Python FastAPI
- **Base de Datos**: MongoDB

## Funcionalidades Implementadas

### Página "Nuevo Alquiler" (Actualizada: 11/02/2026)
- **Layout de 3 columnas**: Cliente | Duración | Artículos (búsqueda)
- **Artículos Seleccionados**: Ancho completo debajo
- **Sistema de Tickets Paralelos (Cuentas Paralelas)**:
  - Barra de pestañas para múltiples alquileres simultáneos
  - Persistencia en localStorage (24 horas)
  - Auto-renombrado con nombre del cliente
- **Footer fijo de cobro** (margen inferior 23px):
  - Descuento de proveedor visible
  - Total, Método de pago, Importe, Depósito, Descuento
  - Botón "Completar"
- **Navegación Tab optimizada**: Cliente → Días → Buscar Artículos → Completar
- **Popup de pago compacto**

### Página "Clientes"
- **Filtros**: Todos | Activos Hoy | Inactivos
- **Bug corregido**: Endpoint para super_admin

### Página "Devoluciones" y "Alquileres Activos"
- **Código interno**: Ahora muestra el código interno de cada artículo en lugar del código de barras
- **Enriquecimiento automático**: Backend enriquece items con internal_code

### Página "Proveedores" (Nueva funcionalidad: 11/02/2026)
- **Filtro por fecha en estadísticas**: Campos Desde/Hasta para filtrar período
- **Impresión de ticket**: Genera informe de comisiones para compartir con proveedor
- **Estadísticas mejoradas**: Clientes, Ingresos, Ticket medio, Comisión, Lista detallada

## Bugs Corregidos (Sesión 11/02/2026)
1. ✅ Layout de Nuevo Alquiler (3 columnas)
2. ✅ Footer fijo con campos de pago integrados
3. ✅ Margen inferior 23px para evitar barra de herramientas
4. ✅ Descuento de proveedor en footer
5. ✅ KeyError store_id para super_admin
6. ✅ Código interno en lugar de barcode en toda la app

## Archivos Principales
- `/app/frontend/src/pages/NewRental.jsx` - Página de nuevo alquiler
- `/app/frontend/src/hooks/useMultiTicketPersistence.js` - Hook de tickets paralelos
- `/app/frontend/src/pages/Returns.jsx` - Página de devoluciones
- `/app/frontend/src/pages/ActiveRentals.jsx` - Alquileres activos
- `/app/frontend/src/pages/Providers.jsx` - Proveedores con estadísticas
- `/app/frontend/src/pages/Customers.jsx` - Clientes
- `/app/backend/server.py` - Backend API

## Endpoints Actualizados
- `GET /api/rentals` - Enriquece items con internal_code
- `GET /api/rentals/{rental_id}` - Enriquece items con internal_code
- `GET /api/rentals/barcode/{barcode}` - Enriquece items con internal_code
- `GET /api/rentals/pending/returns` - Enriquece items con internal_code
- `GET /api/items/by-barcodes` - Nuevo endpoint para buscar códigos internos
- `GET /api/sources/{source_id}/stats` - Filtros de fecha añadidos

### Configuración por Defecto para Nuevas Tiendas (11/02/2026)
- **auto_print_ticket**: ACTIVADO por defecto
- **quick_scan_mode**: ACTIVADO por defecto
- Backend: Modificados endpoints de creación de tiendas (registro y super admin)
- Frontend: SettingsContext carga valores del store al iniciar sesión
- No afecta tiendas existentes

### Navegación por Teclado Global (11/02/2026)
- **Hook**: `useKeyboardNavigation` para navegación tipo spreadsheet
- **Enter como Tab**: En formularios, Enter avanza al siguiente campo
- **Flechas direccionales**: ArrowUp/Down/Left/Right navegan entre campos
- **Excepción cursor**: Flechas solo mueven foco si cursor está al inicio/fin del texto
- **Focus Ring**: Borde azul grueso (3px) visible en todos los elementos focusados
- **Grid Navigation**: Hook `useGridNavigation` para tablas con navegación columna por columna
- Archivos: `/app/frontend/src/hooks/useKeyboardNavigation.js`, `/app/frontend/src/App.css`

### CSS Impresión Térmica (11/02/2026)
- `@page { size: auto; margin: 0mm; }` - Elimina márgenes del navegador
- `.ticket-container` forzado a 80mm de ancho
- Archivos: `/app/frontend/src/lib/ticketGenerator.js`, `/app/frontend/src/App.css`

## Backlog / Tareas Futuras
- Refactorizar NewRental.jsx (archivo muy grande, +3000 líneas)
- Dividir en componentes más pequeños
- Bug: Editar email/contraseña del admin desde Gestión de Equipo
- Verificar: Opción "Pendiente" en alquileres activos
