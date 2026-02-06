import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('.env')

async def check_item_types():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Check item_types structure
    sample = await db.item_types.find_one({})
    print('Estructura de item_types:')
    if sample:
        print(f'  Campos: {list(sample.keys())}')
        print(f'  Ejemplo: {sample}')
    else:
        print('  ⚠️  No hay item_types en la BD')
    
    # Count by store
    print('\nTipos por tienda:')
    pipeline = [{'$group': {'_id': '$store_id', 'count': {'$sum': 1}}}]
    result = await db.item_types.aggregate(pipeline).to_list(10)
    for r in result:
        print(f'  Store {r["_id"]}: {r["count"]} tipos')
    
    # Check all item_types
    all_types = await db.item_types.find({}, {'_id': 0, 'store_id': 1, 'value': 1, 'label': 1}).to_list(100)
    print(f'\nTodos los tipos ({len(all_types)}):')
    for t in all_types[:15]:
        print(f'  - Store {t.get("store_id")}: {t.get("value")} ({t.get("label")})')
    
    # Check items without item_type
    items_no_type = await db.items.count_documents({'item_type': {'$in': ['', None]}})
    items_with_type = await db.items.count_documents({'item_type': {'$exists': True, '$ne': ''}})
    print(f'\nEstado de artículos:')
    print(f'  Con tipo: {items_with_type}')
    print(f'  Sin tipo: {items_no_type}')
    
    client.close()

asyncio.run(check_item_types())
