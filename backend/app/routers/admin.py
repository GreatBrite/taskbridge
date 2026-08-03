from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditLog, Job, Notification, User
from app.schemas import AdminComplaintIn
from app.security import require_admin
from app.services.audit import audit

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview")
def overview(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict[str, int]:
    return {
        "users": db.query(User).count(),
        "jobs": db.query(Job).count(),
        "notifications": db.query(Notification).count(),
        "audit_logs": db.query(AuditLog).count(),
    }


@router.post("/complaints")
def create_complaint(payload: AdminComplaintIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict[str, str]:
    audit(db, actor=admin, action="complaint.created", entity_type="user", entity_id=payload.user_id, payload={"reason": payload.reason})
    return {"status": "ok"}


@router.post("/users/{user_id}/block")
def block_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict[str, str]:
    user = db.get(User, user_id)
    if user:
        user.is_blocked = True
        db.commit()
        audit(db, actor=admin, action="user.blocked", entity_type="user", entity_id=user.id)
    return {"status": "ok"}
