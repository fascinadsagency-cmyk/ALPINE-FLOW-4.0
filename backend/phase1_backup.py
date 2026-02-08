#!/usr/bin/env python3
"""
💾 FASE 1: BACKUP COMPLETO DE LA BASE DE DATOS
==============================================

Este script hace un backup completo de todas las colecciones
en formato JSON antes de comenzar la migración multi-tenant.

⚠️  CRÍTICO: Este backup es necesario para poder revertir cambios si algo falla.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import json
import os
from datetime import datetime

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'alpineflow')
BACKUP_DIR = "/app/backup_multi_tenant"

async def backup_database():
    """Hacer backup completo de todas las colecciones"""
    
    print("=" * 70)
    print("💾 FASE 1: BACKUP COMPLETO DE BASE DE DATOS")
    print("=" * 70)
    print()
    
    # Create backup directory
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Get all collections
        collections = await db.list_collection_names()
        
        print(f"📦 Colecciones a respaldar: {len(collections)}")
        print()
        
        total_docs = 0
        backups_created = []
        
        for collection_name in collections:
            # Skip system collections
            if collection_name.startswith('system.'):
                continue
            
            print(f"Respaldando: {collection_name}...", end=" ")
            
            # Get all documents
            documents = await db[collection_name].find({}).to_list(None)
            
            if documents:
                # Save to JSON
                filename = f"{BACKUP_DIR}/{collection_name}_{timestamp}.json"
                
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(documents, f, indent=2, ensure_ascii=False, default=str)
                
                print(f"✅ {len(documents)} docs → {filename}")
                total_docs += len(documents)
                backups_created.append({
                    "collection": collection_name,
                    "count": len(documents),
                    "file": filename
                })
            else:
                print("⚠️  Vacía (no respaldada)")
        
        # Create manifest
        manifest = {
            "timestamp": timestamp,
            "database": DB_NAME,
            "total_collections": len(backups_created),
            "total_documents": total_docs,
            "backups": backups_created
        }
        
        manifest_file = f"{BACKUP_DIR}/manifest_{timestamp}.json"
        with open(manifest_file, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2)
        
        print()
        print("=" * 70)
        print("✅ BACKUP COMPLETADO")
        print("=" * 70)
        print(f"   Directorio: {BACKUP_DIR}")
        print(f"   Colecciones respaldadas: {len(backups_created)}")
        print(f"   Total documentos: {total_docs:,}")
        print(f"   Manifest: {manifest_file}")
        print()
        print("💡 Para restaurar, ejecutar:")
        print(f"   cd {BACKUP_DIR} && mongorestore --db {DB_NAME}")
        print()
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(backup_database())
