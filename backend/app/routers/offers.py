from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Chat, Job, JobStatus, Offer, OfferStatus, User
from app.schemas import ChatOut, OfferOut
from app.security import current_user
from app.services.audit import audit
from app.services.notifications import create_notification

router = APIRouter(prefix="/offers", tags=["offers"])


@router.post("/{offer_id}/select", response_model=ChatOut)
def select_offer(offer_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)) -> Chat:
    offer = db.get(Offer, offer_id)
    if not offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")
    job = db.get(Job, offer.job_id)
    if not job or job.customer_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")
    if job.status not in {JobStatus.offer_received, JobStatus.published, JobStatus.assigned}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Offer cannot be selected")

    db.query(Offer).filter(Offer.job_id == job.id, Offer.id != offer.id).update({"status": OfferStatus.declined})
    offer.status = OfferStatus.selected
    job.status = JobStatus.assigned
    job.selected_offer_id = offer.id

    chat = db.query(Chat).filter(Chat.job_id == job.id, Chat.customer_id == job.customer_id, Chat.contractor_id == offer.contractor_id).one_or_none()
    if not chat:
        chat = Chat(job_id=job.id, customer_id=job.customer_id, contractor_id=offer.contractor_id)
        db.add(chat)
    db.commit()
    db.refresh(chat)

    contractor = db.get(User, offer.contractor_id)
    if contractor:
        create_notification(db, user=contractor, kind="offer_selected", payload={"job_id": job.id, "chat_id": chat.id})
    audit(db, actor=user, action="offer.selected", entity_type="offer", entity_id=offer.id, payload={"chat_id": chat.id})
    return chat


@router.get("/{offer_id}", response_model=OfferOut)
def read_offer(offer_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)) -> Offer:
    offer = db.get(Offer, offer_id)
    if not offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")
    job = db.get(Job, offer.job_id)
    if not job or (job.customer_id != user.id and offer.contractor_id != user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")
    return offer
