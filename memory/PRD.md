# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Problema Original
Sistema de gestión completo para tiendas de alquiler de equipos de esquí/snowboard con énfasis en VELOCIDAD y PRECISIÓN.

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn UI + XLSX (para importación)
- **Backend**: FastAPI + Python
- **Base de datos**: MongoDB
- **Autenticación**: JWT

## Funcionalidades Implementadas

### 1. Importador Universal de Clientes (2026-01-29)
**Sistema completo de importación masiva:**

**Formatos soportados:** CSV, XLS, XLSX

**Flujo de 4 pasos:**
1. **Subir archivo**: Área de drag & drop con validación
2. **Mapeo de campos**: Auto-mapeo inteligente + mapeo manual
3. **Previsualización**: Muestra las primeras 5 filas
4. **Resultados**: Importados, duplicados (omitidos), errores

**Campos:**
- Obligatorios: DNI*, Nombre*, Teléfono*
- Opcionales: Email, Dirección, Ciudad, Proveedor, Notas

### 2. Importador Universal de Inventario (2026-01-29) ✨ NUEVO
**Misma estructura que el importador de clientes:**

**Formatos soportados:** CSV, XLS, XLSX

**Flujo de 4 pasos:** Subir → Mapear → Previsualizar → Resultados

**Campos:**
- Obligatorios: Código Interno*, Tipo de Artículo*, Marca*, Talla*
- Opcionales: Código de Barras, Modelo, Gama, Precio de Compra, Fecha, Ubicación

**Detección de duplicados:** Por código interno

### 3. Ajuste de Campos en Ficha de Cliente
**Campos obligatorios (con asterisco rojo):** DNI*, Nombre*, Teléfono*
**Campos opcionales (sin asterisco):** Email, Dirección, Ciudad, etc.

### 4. Módulo de Packs con Tipos Personalizados
- Carga dinámica de tipos de artículo desde `/api/item-types`

### 5. Buscador de Clientes en Taller Externo
- Autocompletado con debounce (300ms)
- Búsqueda por nombre, teléfono o DNI

### 6. Módulo de Caja (Rediseñado)
- 3 Pestañas: Caja del Día, Cierres Pasados, Histórico
- Arqueo manual con efectivo y tarjeta
- Revertir cierres

### 7. Rentabilidad en Inventario
- Coste, Ingresos, Amortización, Beneficio por artículo

### 8. Filtro de Estado en Clientes
- Todos / Activos Hoy / Inactivos

### 9. Modificar Duración de Alquileres
- Flujo de 3 pasos con ajuste financiero

## API Endpoints

### Importación
```
POST /api/customers/import
Body: { customers: [{ dni, name, phone, email?, ... }] }
Response: { imported, duplicates, errors, duplicate_dnis }

POST /api/items/import
Body: { items: [{ internal_code, item_type, brand, size, ... }] }
Response: { imported, duplicates, errors, duplicate_codes }
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
- **ALTO**: Páginas grandes de React

## Credenciales de Prueba
- Usuario: test_packs_user
- Contraseña: test123456

## Changelog
- **v2.9.0** (2026-01-29): 
  - Importador universal de inventario (CSV/XLS/XLSX) con mapeo y detección de duplicados
- **v2.8.0** (2026-01-29): Importador de clientes, Email opcional
- **v2.7.0** (2026-01-29): Packs con tipos personalizados, buscador en taller
- **v2.6.0** (2026-01-29): Rediseño del Módulo de Caja
