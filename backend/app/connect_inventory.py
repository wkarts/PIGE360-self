"""Classify remote WhatsApp instances without exposing another school's bindings."""


def visible_remote_rows(rows, claimed, company_id, school_id, blocked_legacy=()):
    by_name = {}
    for item in claimed:
        by_name.setdefault(item.name, []).append(item)
    items = []
    for row in rows:
        owners = by_name.get(row['name'], ())
        if any(item.company_id != company_id or item.school_id not in (None, school_id)
               or item.id in blocked_legacy for item in owners):
            continue
        current = next((item for item in owners if item.school_id == school_id), None)
        items.append({**row, 'registered': current is not None,
                      'local_id': current.id if current else '',
                      'source': current.source if current else ''})
    return items
