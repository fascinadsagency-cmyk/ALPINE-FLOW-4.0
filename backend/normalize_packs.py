#!/usr/bin/env python3
"""
🔧 SCRIPT: Normalizar valores de item_type en Packs
===================================================

Este script normaliza los valores de item_type en todos los packs
para que coincidan con los artículos normalizados.

⚠️  CRÍTICO: Este script modifica la colección packs.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import re

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'alpineflow')

def normalize_type_name(type_name: str) -> str:
    """Normaliza el nombre del tipo de artículo"""
    if not type_name:
        return ""
    
    normalized = type_name.strip().lower()
    normalized = re.sub(r'[\s_]+', '_', normalized)
    normalized = normalized.strip('_')
    
    return normalized

async def normalize_packs():
    """Normalizar item_type en todos los packs"""
    
    print("=" * 70)
    print("🔧 NORMALIZANDO PACKS")
    print("=" * 70)
    print()
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Obtener todos los packs
        packs = await db.packs.find({}, {"_id": 0}).to_list(None)
        
        print(f"📦 Total packs: {len(packs)}")
        print()
        
        updated_count = 0
        
        for pack in packs:
            pack_id = pack.get('id')
            name = pack.get('name')
            original_items = pack.get('items', [])
            
            # Normalizar cada item_type en el pack
            normalized_items = [normalize_type_name(item) for item in original_items]
            
            # Verificar si hay cambios
            if original_items != normalized_items:
                print(f"📝 Pack: {name}")
                print(f"   Original: {original_items}")
                print(f"   Normalizado: {normalized_items}")
                
                # Actualizar en BD
                result = await db.packs.update_one(
                    {"id": pack_id},
                    {
                        "$set": {
                            "items": normalized_items,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                if result.modified_count > 0:
                    print(f"   ✅ Actualizado")
                    updated_count += 1
                else:
                    print(f"   ⚠️  No se pudo actualizar")
                
                print()
            else:
                print(f"✅ Pack '{name}' ya está normalizado")
        
        print("=" * 70)
        print("✅ NORMALIZACIÓN COMPLETADA")
        print("=" * 70)
        print(f"   Packs actualizados: {updated_count}/{len(packs)}")
        print()
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(normalize_packs())
