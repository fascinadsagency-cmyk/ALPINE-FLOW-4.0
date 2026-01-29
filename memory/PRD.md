# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Problema Original
Sistema de gestión completo para tiendas de alquiler de equipos de esquí/snowboard con énfasis en VELOCIDAD y PRECISIÓN.

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn UI + XLSX (para importación)
- **Backend**: FastAPI + Python
- **Base de datos**: MongoDB
- **Autenticación**: JWT

## Funcionalidades Implementadas

### 1. Importador Universal de Clientes (2026-01-29) ✨ NUEVO
**Sistema completo de importación masiva:**

**Formatos soportados:**
- CSV (separador por comas o punto y coma)
- XLS (Excel 97-2003)
- XLSX (Excel moderno)

**Flujo de 4 pasos:**
1. **Subir archivo**: Área de drag & drop con validación de formato
2. **Mapeo de campos**: Asociar columnas del archivo con campos del sistema
   - Auto-mapeo inteligente (detecta nombres similares)
   - Campos obligatorios: DNI*, Nombre*, Teléfono*
   - Campos opcionales: Email, Dirección, Ciudad, Proveedor, Notas
3. **Previsualización**: Muestra las primeras 5 filas antes de importar
4. **Resultados**: Resumen de importados, duplicados (omitidos), errores

**Detección de duplicados:**
- Por DNI (principal)
- Por Email (secundario)

### 2. Ajuste de Campos en Ficha de Cliente (2026-01-29) ✨ NUEVO
**Campos obligatorios (con asterisco rojo):**
- DNI/Pasaporte *
- Nombre Completo *
- Teléfono *

**Campos opcionales (sin asterisco):**
- Email
- Dirección
- Población/Ciudad
- Colaborador/Proveedor
- Observaciones Internas

### 3. Módulo de Packs con Tipos Personalizados (2026-01-29)
- Carga dinámica de tipos de artículo desde `/api/item-types`
- Compatible con tipos por defecto y personalizados

### 4. Buscador de Clientes en Taller Externo (2026-01-29)
- Autocompletado con debounce (300ms)
- Búsqueda por nombre, teléfono o DNI
- Opción de crear nuevo cliente desde el diálogo

### 5. Módulo de Caja - REDISEÑADO
**3 Pestañas:** Caja del Día, Cierres Pasados, Histórico Movimientos
- Arqueo manual con efectivo y tarjeta
- Revertir cierres
- Sin límite horario para cerrar

### 6. Rentabilidad en Inventario
- Coste, Ingresos, Amortización, Beneficio por artículo

### 7. Filtro de Estado en Clientes
- Todos / Activos Hoy / Inactivos

### 8. Modificar Duración de Alquileres
- Flujo de 3 pasos con ajuste financiero

## API Endpoints Nuevos

### Importación de Clientes
```
POST /api/customers/import
Body: { customers: [{ dni, name, phone, email?, address?, city?, source?, notes? }] }
Response: { imported: number, duplicates: number, errors: number, duplicate_dnis: string[] }
```

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
- **CRÍTICO**: `/app/backend/server.py` es un monolito de +3000 líneas
- **ALTO**: Páginas grandes de React (CashRegister.jsx, ActiveRentals.jsx, Inventory.jsx, Customers.jsx)

## Credenciales de Prueba
- Usuario: test_packs_user
- Contraseña: test123456

## Changelog
- **v2.8.0** (2026-01-29): 
  - Importador universal de clientes (CSV/XLS/XLSX) con mapeo y detección de duplicados
  - Email ahora es opcional, Teléfono es obligatorio
  - Asteriscos rojos en campos obligatorios del formulario
- **v2.7.0** (2026-01-29): Packs con tipos personalizados, buscador en taller
- **v2.6.0** (2026-01-29): Rediseño del Módulo de Caja
- **v2.5.0** (2026-01-29): Rentabilidad en Inventario
