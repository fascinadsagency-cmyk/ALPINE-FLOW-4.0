# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Problema Original
Sistema de gestión completo para tiendas de alquiler de equipos de esquí/snowboard con énfasis en VELOCIDAD y PRECISIÓN.

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + Python
- **Base de datos**: MongoDB
- **Autenticación**: JWT

## Funcionalidades Implementadas (MVP + Mejoras)

### 1. Autenticación
- Login/Registro con JWT
- Roles: admin, employee

### 2. Dashboard
- KPIs en tiempo real (ingresos, alquileres, ocupación)
- Alertas de devoluciones vencidas
- Estado del inventario
- Actividad reciente

### 3. Gestión de Clientes
- Búsqueda rápida por DNI/nombre/teléfono
- Historial de alquileres
- Tallas preferidas automáticas

### 4. Proceso de Alquiler (Optimizado)
- **Sistema de fechas inteligente**:
  - Campo "Número de días" prominente
  - Fecha inicio automática (hoy/mañana según hora 15:00)
  - Botones rápidos 1d, 2d, 3d, 5d, 7d
  - Cálculo bidireccional días ↔ fechas
- Escaneo de artículos por código de barras
- Sistema de descuentos (%, € fijo, manual)
- Múltiples métodos de pago
- Precios editables por artículo

### 5. Devoluciones Ultra-Rápidas
- Escanear cualquier artículo → encuentra alquiler
- Vista de artículos pendientes vs devueltos
- Alertas de pagos pendientes

### 6. Inventario
- **Importación CSV masiva**
- **Exportación a CSV**
- **Generación de códigos de barras**
- Estados: disponible, alquilado, mantenimiento, baja
- Filtros por tipo y estado
- Contador de días de uso
- Cálculo de amortización

### 7. Tarifas
- **Precios individuales** por tipo y duración (1d, 2-3d, 4-7d, semana, temporada)
- **Sistema de Packs/Combos** con precios especiales
- Creador visual de packs

### 8. Mantenimiento
- **Alertas automáticas** según días de uso
- Artículos que necesitan mantenimiento AHORA
- Próximos a mantenimiento (< 5 salidas)
- Historial de mantenimientos
- Tipos: afilado, encerado, reparación, inspección

### 9. Reportes
- Cierre de día con desglose por método de pago
- Lista de devoluciones pendientes
- Porcentaje de ocupación del inventario

## Próximas Funcionalidades (Backlog)

### P0 - Alta Prioridad
- [ ] Importación de datos históricos
- [ ] Histórico de pagos con contraseña admin

### P1 - Media Prioridad
- [ ] Integración WhatsApp para avisos
- [ ] Reimprimir tickets de TPV
- [ ] Reservas con calendario visual

### P2 - Baja Prioridad  
- [ ] Integración TPV bancario automática
- [ ] OCR para escaneo de DNI
- [ ] Generación de PDFs

## Credenciales de Prueba
- Usuario: admin
- Contraseña: admin123

## Última Actualización
Fecha: 2026-01-27
Versión: 1.2.0
