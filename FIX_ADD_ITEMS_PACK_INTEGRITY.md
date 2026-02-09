# 🔧 CORRECCIÓN: Integridad Financiera en "Añadir a Alquiler Activo"

## 📋 Problema Reportado

**Bug crítico:** Al añadir artículos a un alquiler activo que forman un pack:
- ✅ Visualmente el sistema cobra **27€** (precio con pack aplicado)
- ❌ Pero en la base de datos registra **34€** (precio sin pack)
- ❌ Los movimientos de caja no coinciden con el dinero real cobrado

## 🔍 Causa Raíz Identificada

**Código problemático en `server.py` (líneas 3939-3959):**

```python
# ❌ ANTES (bug)
for item_input in add_items_input.items:
    item_price = item_input.unit_price or 0
    additional_rental_amount += item_price  # ← Suma precios individuales
```

El backend estaba:
1. Ignorando el `calculated_total` enviado por el frontend
2. Sumando los `unit_price` individuales de cada artículo (sin considerar el descuento del pack)
3. Registrando ese monto incorrecto en `cash_movements.amount`

## ✅ Solución Implementada

### 1. Backend - Aceptar y usar `calculated_total`

**Archivo:** `/app/backend/server.py`

**Cambio 1:** Añadido campo opcional `calculated_total` al modelo (línea 307):
```python
class AddItemsToRentalInput(BaseModel):
    items: List[RentalItemInput]
    days: Optional[int] = None
    end_date: Optional[str] = None
    charge_now: bool = True
    payment_method: Optional[str] = "cash"
    calculated_total: Optional[float] = None  # ← NUEVO: Total con packs desde frontend
```

**Cambio 2:** Usar `calculated_total` si está presente (líneas 3937-3980):
```python
# ✅ DESPUÉS (corregido)
# ... procesar items ...

# CORRECCIÓN: Usar calculated_total del frontend si está disponible (incluye lógica de packs)
if add_items_input.calculated_total is not None:
    additional_rental_amount = add_items_input.calculated_total  # ← Usa el precio correcto
else:
    # Fallback: sumar precios individuales (legacy)
    additional_rental_amount = sum(item["unit_price"] for item in new_items_processed)
```

**Resultado:** Ahora el backend registra en `cash_movements.amount` el monto REAL cobrado (27€), no el precio sin descuento (34€).

### 2. Frontend - Ya estaba correcto

El frontend **YA** estaba enviando el `calculated_total` correcto:

**Archivo:** `/app/frontend/src/pages/ActiveRentals.jsx` (líneas 502-530)

```javascript
const confirmAddItems = async () => {
  // Calcular total con lógica de packs ✅
  const { total } = calculateAddItemsTotalWithPacks();
  
  const response = await axios.post(
    `${API}/rentals/${addItemsRental.id}/add-items`,
    {
      items: addItemsSelected.map(item => ({
        barcode: item.barcode,
        unit_price: item.unit_price,
        person_name: item.person_name
      })),
      days: addItemsDays,
      charge_now: addItemsChargeNow,
      payment_method: addItemsPaymentMethod,
      calculated_total: total  // ✅ Envía el precio correcto con pack
    }
  );
};
```

La UI también está correcta:
- ✅ Muestra "Ahorro por pack" cuando hay packs detectados
- ✅ NO muestra "Descuento" como campo separado (no existe ese campo confuso)
- ✅ Muestra el total final correcto

## 🧪 Instrucciones de Validación (OBLIGATORIA)

### Simulación Manual:

1. **Crear/Usar un alquiler activo**
   - Ve a "Alquileres Activos"
   - Selecciona cualquier alquiler activo

2. **Añadir artículos que formen un pack**
   - Ejemplo: `F900+5067`, `F902+5065` (o cualquier combinación que forme un pack en tu tienda)
   - **Anota:**
     - Precio Pack: `______€` (lo que dice el modal)
     - Precio Suelto: `______€` (suma individual si NO hubiera pack)

3. **Cobrar**
   - Marca "Cobrar ahora"
   - Selecciona método de pago (efectivo o tarjeta)
   - Confirma

4. **Verificar en Base de Datos** ✅
   - Ve a "Caja" → "Movimientos"
   - Busca el último movimiento de tipo "Ampliación de material"
   - **Verifica:** El `amount` debe ser igual al **Precio Pack**, NO al Precio Suelto

### ✅ Criterio de Éxito:

```
Si el precio del pack es 27€ y el precio suelto sería 34€:
  ✅ El movimiento en caja debe mostrar 27€
  ❌ Si muestra 34€ → El bug persiste
```

## 📊 Impacto del Fix

- **Integridad Financiera:** ✅ Restaurada. Los movimientos de caja ahora reflejan el dinero real cobrado
- **Compatibilidad:** ✅ Backwards compatible. Si el frontend antiguo no envía `calculated_total`, el backend usa el cálculo legacy
- **UI:** ✅ Sin cambios (ya estaba correcta)

## 📝 Archivos Modificados

1. `/app/backend/server.py`
   - Línea 307: Añadido campo `calculated_total` a `AddItemsToRentalInput`
   - Líneas 3937-3980: Usar `calculated_total` si está presente

2. `/app/frontend/src/pages/ActiveRentals.jsx`
   - Sin cambios (ya enviaba `calculated_total` correctamente)

## 🚀 Estado

- ✅ Código corregido
- ⏳ **Pendiente:** Validación manual por usuario con datos reales

---

**Fecha:** 2026-02-09  
**Prioridad:** 🔴 P0 (Bug crítico de integridad financiera)
