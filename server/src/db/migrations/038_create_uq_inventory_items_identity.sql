CREATE UNIQUE INDEX uq_inventory_items_identity
ON inventory_items (
    LOWER(item_name),
    LOWER(COALESCE(variant, '')),
    package_size,
    package_size_unit,
    unit
)
NULLS NOT DISTINCT;