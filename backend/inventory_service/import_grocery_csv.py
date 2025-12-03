import asyncio
import csv
import sys
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorCollection

from database import get_items_collection

load_dotenv()


def normalize_name(name: str) -> str:
  """Lowercase and strip for comparisons."""
  return name.strip().lower()


async def import_csv(csv_path: Path, collection: AsyncIOMotorCollection):
  existing = {}
  async for doc in collection.find({}, projection={"_id": 1, "name": 1}):
    existing[normalize_name(doc["name"])] = doc["_id"]

  to_insert = []
  with csv_path.open(newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
      name = row.get("name", "").strip()
      if not name:
        continue
      key = normalize_name(name)
      if key in existing:
        continue
      price = row.get("price")
      size = row.get("size")
      doc = {
        "name": name,
        "default_unit": size or None,
        "price": price or None,
        "size": size or None,
      }
      to_insert.append(doc)

  if not to_insert:
    print("No new items to insert.")
    return

  result = await collection.insert_many(to_insert)
  print(f"Inserted {len(result.inserted_ids)} items.")


async def main(path_str: Optional[str]):
  csv_path = Path(path_str or "grocery_store.csv")
  if not csv_path.exists():
    print(f"CSV file not found at {csv_path}")
    sys.exit(1)
  collection = get_items_collection()
  await import_csv(csv_path, collection)


if __name__ == "__main__":
  asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else None))
