# 🐛 BUG CRÍTICO CORREGIDO: Contador de Clientes Activos Incorrecto

## 📋 Problema Reportado

En la pantalla de Clientes:
- El badge "Activos Hoy" mostraba **2 clientes**
- Pero la lista solo mostraba **1 cliente**
- Inconsistencia entre el contador y los datos reales

## 🔍 Causa Raíz Identificada

**Archivo:** `/app/backend/server.py` - Endpoint `/customers/stats/summary`

**Código problemático (líneas 1140-1152):**

```python
# ❌ BUG: Contaba clientes dos veces
# Contar por customer_id
active_rentals = await db.rentals.distinct(
    "customer_id",
    {"store_id": store_id, "status": {"$in": ["active", "partial"]}}
)
active_count = len(active_rentals)

# Contar por customer_dni
active_dnis = await db.rentals.distinct(
    "customer_dni",
    {"store_id": store_id, "status": {"$in": ["active", "partial"]}}
)
active_count += len(active_dnis)  # ❌ SUMA = duplica clientes!
```

**El problema:**

Si un alquiler tiene tanto `customer_id` como `customer_dni` (que es lo normal), el cliente se contaba **DOS VECES**:
1. Una vez por su `customer_id`
2. Otra vez por su `customer_dni`

**Ejemplo:**
- Cliente "Juan Pérez" tiene un alquiler con:
  - `customer_id: "abc123"`
  - `customer_dni: "12345678X"`
- El sistema lo contaba como **2 clientes activos** en lugar de 1

**Además:**
El endpoint de listado (`/customers/paginated/list`) usaba una lógica diferente (agregación correcta), causando inconsistencia entre:
- El contador (badge) → 2 clientes ❌
- El listado real → 1 cliente ✅

## ✅ Solución Implementada

Reescribí completamente el endpoint de estadísticas para usar la **misma agregación** que el listado, garantizando consistencia:

**Archivo:** `/app/backend/server.py` - Endpoint `/customers/stats/summary` (líneas 1131-1196)

```python
@api_router.get("/customers/stats/summary")
async def get_customers_stats(current_user: CurrentUser = Depends(get_current_user)):
    """Get customer statistics - OPTIMIZED to match paginated list logic"""
    store_filter = current_user.get_store_filter()
    total = await db.customers.count_documents(store_filter)
    
    # ✅ Usar agregación para contar clientes únicos (misma lógica que el listado)
    pipeline = [
        {"$match": store_filter},
        
        # JOIN con rentals activos
        {
            "$lookup": {
                "from": "rentals",
                "let": {
                    "customer_id": "$id",
                    "customer_dni": {"$toUpper": "$dni"}
                },
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {"$eq": ["$store_id", store_filter["store_id"]]},
                                    {"$in": ["$status", ["active", "partial"]]},
                                    {
                                        "$or": [
                                            {"$eq": ["$customer_id", "$$customer_id"]},
                                            {"$eq": [{"$toUpper": "$customer_dni"}, "$$customer_dni"]}
                                        ]
                                    }
                                ]
                            }
                        }
                    },
                    {"$limit": 1}
                ],
                "as": "active_rentals"
            }
        },
        
        # Calcular has_active_rental
        {
            "$addFields": {
                "has_active_rental": {"$gt": [{"$size": "$active_rentals"}, 0]}
            }
        },
        
        # Agrupar y contar
        {
            "$group": {
                "_id": None,
                "active": {"$sum": {"$cond": ["$has_active_rental", 1, 0]}},
                "inactive": {"$sum": {"$cond": ["$has_active_rental", 0, 1]}}
            }
        }
    ]
    
    result = await db.customers.aggregate(pipeline).to_list(1)
    
    if result:
        active_count = result[0]["active"]
        inactive_count = result[0]["inactive"]
    else:
        active_count = 0
        inactive_count = total
    
    return {
        "total": total,
        "active": active_count,    # ✅ Ahora cuenta correctamente
        "inactive": inactive_count
    }
```

## 📊 Resultado

### Antes:
```
Endpoint de stats: 2 clientes activos (INCORRECTO - duplicaba)
Endpoint de list:  1 cliente activo (CORRECTO)
Badge en UI:       "2" ❌
Lista en UI:       1 cliente ✅
→ INCONSISTENCIA
```

### Después:
```
Endpoint de stats: 1 cliente activo ✅
Endpoint de list:  1 cliente activo ✅
Badge en UI:       "1" ✅
Lista en UI:       1 cliente ✅
→ CONSISTENCIA TOTAL
```

## 🎯 Ventajas de la Solución

1. **Consistencia garantizada**: Stats y listado usan la misma lógica
2. **Sin duplicados**: Cada cliente se cuenta solo una vez
3. **Eficiente**: Usa agregación de MongoDB (rápido)
4. **Mantenible**: Un solo algoritmo para ambos endpoints

## 🧪 Verificación

Para verificar el fix:

1. Ve a **"Clientes"**
2. Observa el badge en **"Activos Hoy"** (ej: dice "1")
3. Haz clic en **"Activos Hoy"**
4. Verifica que la lista muestre **exactamente** el mismo número (1 cliente)
5. El texto al final debe decir "**1 cliente en total**" ✅

## 📝 Archivos Modificados

1. **`/app/backend/server.py`** (líneas 1131-1196)
   - Reescrito endpoint `/customers/stats/summary`
   - Ahora usa agregación MongoDB (igual que el listado)
   - Eliminado el conteo duplicado por customer_id + customer_dni

2. **`/app/frontend/src/pages/Customers.jsx`**
   - Limpiados logs de debug temporales

## 💡 Lección Aprendida

**Principio DRY (Don't Repeat Yourself):**

Cuando dos endpoints necesitan la misma lógica (contar clientes activos), deben usar el **mismo algoritmo**. Si cada uno tiene su propia implementación, eventualmente divergen y causan inconsistencias.

**Mejor práctica:** Extraer la lógica común a una función helper o usar el mismo pipeline en ambos.

---

**Fecha:** 2026-02-09  
**Prioridad:** 🔴 P0 (Bug crítico - datos incorrectos)  
**Tipo:** Lógica de negocio / Integridad de datos
