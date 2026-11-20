from datetime import date


def state_on_date(enrollment, on_date: date, events):
    """Reconstitui o vínculo retrocedendo eventos do mais recente ao mais antigo."""
    if enrollment.enrolled_on > on_date:
        return None
    status = enrollment.status
    class_group_id = enrollment.class_group_id
    for event in events:
        event_date = event.created_at.date() if event.created_at else enrollment.enrolled_on
        if event_date > on_date and isinstance(event.before, dict):
            status = str(event.before.get("status") or status)
            class_group_id = str(event.before.get("class_group_id") or class_group_id)
    return status, class_group_id
