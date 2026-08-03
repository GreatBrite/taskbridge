from sqlalchemy.orm import Session

from app.models import Notification, NotificationStatus, User


def create_notification(db: Session, *, user: User, kind: str, payload: dict) -> Notification:
    notification = Notification(user_id=user.id, kind=kind, payload=payload, status=NotificationStatus.pending)
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
