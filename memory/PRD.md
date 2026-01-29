# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn UI + XLSX
- **Backend**: FastAPI + Python
- **Base de datos**: MongoDB
- **Autenticación**: JWT

## Funcionalidades Implementadas

### 1. Panel de Control de Devoluciones en Dashboard (2026-01-29) ✨ NUEVO
**"Torre de control" para el cierre del día:**

- **Métricas dinámicas** por categoría de artículo (Botas, Esquís, Snowboards, Cascos, etc.)
- **Conteo en tiempo real** de artículos pendientes de devolver HOY
- **Detección automática** de todas las categorías de inventario
- **Alerta visual** en ROJO si la hora actual supera la hora de cierre (20:00)
- **Enlace directo**: Al hacer clic en una categoría, navega a Devoluciones filtrada

**Endpoint**: `GET /api/dashboard/returns-control`

### 2. Filtro por Categoría en Devoluciones
- Aceptación de parámetro `?filter=<item_type>` en la URL
- Badge visual "Filtrando: [Categoría]" con botón para quitar filtro
- Filtrado dinámico de la lista de devoluciones pendientes

### 3. Nuevos Campos en Inventario (2026-01-29) ✨ NUEVO
- **Número de Serie**: Identificador único del fabricante
- **Fijación**: Modelo/tipo de fijación instalada (para esquís)

### 4. Reorganización de Columnas en Inventario
Orden correlativo de códigos de identificación:
1. Código Interno (Tu identificador corto)
2. Código de Barras (EAN/UPC)
3. Número de Serie (Fabricante)
4. Tipo | Marca/Modelo | Talla | Fijación | Estado

### 5. Búsqueda Mejorada en Inventario
El buscador localiza artículos por:
- Código Interno
- Código de Barras
- Número de Serie
- Marca, Modelo, Talla

### 6. Importador Universal (Clientes e Inventario)
- Soporte para CSV, XLS, XLSX
- Mapeo de campos inteligente
- Detección de duplicados
- Previsualización antes de importar

### 7. Módulo de Caja (Rediseñado)
- 3 Pestañas: Caja del Día, Cierres Pasados, Histórico
- Arqueo manual con efectivo y tarjeta

### 8. Rentabilidad en Inventario
- Coste, Ingresos, Amortización, Beneficio

## API Endpoints Nuevos

```
GET /api/dashboard/returns-control
Response: { total_pending, pending_by_category, is_past_closing, closing_hour }

GET /api/devoluciones?filter=<item_type>  (filtro en frontend)
```

## Próximas Tareas

### P1 - Alta Prioridad
- [ ] Pestaña de Soporte y Mejoras
- [ ] Finalizar Sistema de Impresión

### P2 - Media Prioridad
- [ ] Integraciones (WhatsApp, TPV, VeriFactu, Email)

## Credenciales de Prueba
- Usuario: test_packs_user
- Contraseña: test123456

## Changelog
- **v3.0.0** (2026-01-29): Panel de Control de Devoluciones en Dashboard, nuevos campos en inventario (Nº Serie, Fijación), búsqueda mejorada, filtros en devoluciones
- **v2.9.0**: Importador de inventario
- **v2.8.0**: Importador de clientes, Email opcional
