# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn UI + XLSX + @dnd-kit
- **Backend**: FastAPI + Python
- **Base de datos**: MongoDB
- **Autenticación**: JWT

## Funcionalidades Implementadas

### 1. Corrección de Módulo de Caja (2026-01-29) ✨ CORREGIDO
**Sincronización 100% fiable:**

- **Conteo de operaciones**: Ahora muestra correctamente el número de movimientos
- **Saldo esperado**: Coincide exactamente con la facturación real por método de pago
- **Desglose por método**: Efectivo y Tarjeta calculados correctamente (income - expense - refund)
- **Impresión automática de arqueo**: Al cerrar caja se genera ticket térmico 80mm
- **Reimprimir cierres**: Botón de impresora en cada cierre pasado

**Ticket de Arqueo incluye:**
- Fecha/Hora apertura y cierre
- Nº de operaciones
- Resumen del día (Entradas, Salidas, Devoluciones)
- Total esperado vs Total contado
- Descuadre resultante (efectivo y tarjeta por separado)
- Notas del cierre

### 2. Panel de Control de Devoluciones en Dashboard
- Métricas dinámicas por categoría de artículo
- Alerta visual ROJA si supera hora de cierre
- Enlace directo a devoluciones filtradas

### 3. Nuevos Campos en Inventario
- Número de Serie (fabricante)
- Fijación (modelo de fijación)
- Reorganización de columnas de identificación

### 4. Importador Universal (Clientes e Inventario)
- Soporte CSV, XLS, XLSX
- Mapeo inteligente de campos
- Detección de duplicados

### 5. Email Opcional en Clientes
- Campos obligatorios: DNI*, Nombre*, Teléfono*
- Asteriscos rojos visuales

## Próximas Tareas

### P1 - Alta Prioridad
- [ ] Pestaña de Soporte y Mejoras
- [ ] Personalización de columnas en Inventario (drag & drop)

### P2 - Media Prioridad
- [ ] Integraciones (WhatsApp, TPV, VeriFactu, Email)

## Credenciales de Prueba
- Usuario: test_packs_user
- Contraseña: test123456

## Changelog
- **v3.1.0** (2026-01-29): Corrección de sincronización de caja, impresión automática de arqueos, botón reimprimir en histórico
- **v3.0.0** (2026-01-29): Panel de Control de Devoluciones, nuevos campos en inventario
- **v2.9.0**: Importador de inventario
- **v2.8.0**: Importador de clientes, Email opcional
