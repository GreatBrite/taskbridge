from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.models import Chat, ContractorProfile, Job, JobStatus, Offer, OfferStatus, Rating, User, UserRole
from app.schemas import BriefOut, JobDraftIn, JobOut, OfferIn, OfferOut, RatingIn, RatingOut
from app.security import current_user
from app.services.audit import audit
from app.services.brief import build_brief
from app.services.notifications import create_notification

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/draft", response_model=JobOut)
def create_draft(
    payload: JobDraftIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    settings: Settings = Depends(get_settings),
) -> Job:
    brief = build_brief(
        category=payload.category,
        description=payload.description,
        city=payload.city or user.city or settings.default_city,
        district=payload.district,
        time_window=payload.time_window,
        budget=payload.budget,
        settings=settings,
    )
    job = Job(
        customer_id=user.id,
        category=payload.category,
        title=str(brief["title"]),
        description=payload.description,
        city=payload.city or user.city or settings.default_city,
        district=payload.district,
        time_window=payload.time_window,
        budget=payload.budget,
        currency=settings.default_currency,
        structured_brief=brief["structured_brief"],
        missing_fields=brief["missing_fields"],
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    audit(db, actor=user, action="job.draft_created", entity_type="job", entity_id=job.id)
    return job


@router.post("/{job_id}/brief", response_model=BriefOut)
def improve_brief(job_id: int, db: Session = Depends(get_db), user: User = Depends(current_user), settings: Settings = Depends(get_settings)) -> BriefOut:
    job = _owned_job(db, job_id, user)
    brief = build_brief(
        category=job.category,
        description=job.description,
        city=job.city,
        district=job.district,
        time_window=job.time_window,
        budget=job.budget,
        settings=settings,
    )
    job.title = str(brief["title"])
    job.structured_brief = brief["structured_brief"]
    job.missing_fields = brief["missing_fields"]
    db.commit()
    return BriefOut(**brief)


@router.post("/{job_id}/publish", response_model=JobOut)
def publish_job(job_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)) -> Job:
    job = _owned_job(db, job_id, user)
    if job.status not in {JobStatus.draft, JobStatus.published}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Job cannot be published from current status")

    job.status = JobStatus.published
    db.commit()
    db.refresh(job)

    contractors = _matching_contractors(db, job)
    for contractor in contractors:
        create_notification(db, user=contractor, kind="new_job", payload={"job_id": job.id, "title": job.title, "category": job.category})
    audit(db, actor=user, action="job.published", entity_type="job", entity_id=job.id, payload={"notified": len(contractors)})
    return job


@router.get("/feed", response_model=list[JobOut])
def contractor_feed(db: Session = Depends(get_db), user: User = Depends(current_user)) -> list[Job]:
    profile = db.query(ContractorProfile).filter(ContractorProfile.user_id == user.id).one_or_none()
    categories = profile.categories if profile and profile.categories else []
    query = db.query(Job).filter(Job.status.in_([JobStatus.published, JobStatus.offer_received]))
    if categories:
        query = query.filter(Job.category.in_(categories))
    if user.city:
        query = query.filter(Job.city == user.city)
    return query.order_by(Job.created_at.desc()).limit(100).all()


@router.get("/mine", response_model=list[JobOut])
def my_jobs(db: Session = Depends(get_db), user: User = Depends(current_user)) -> list[Job]:
    return db.query(Job).filter(Job.customer_id == user.id).order_by(Job.created_at.desc()).all()


@router.get("/{job_id}/offers", response_model=list[OfferOut])
def list_offers(job_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)) -> list[Offer]:
    job = _visible_job(db, job_id, user)
    query = db.query(Offer).filter(Offer.job_id == job.id)
    if job.customer_id != user.id:
        query = query.filter(Offer.contractor_id == user.id)
    return query.order_by(Offer.created_at.desc()).all()


@router.post("/{job_id}/offers", response_model=OfferOut)
def create_offer(job_id: int, payload: OfferIn, db: Session = Depends(get_db), user: User = Depends(current_user)) -> Offer:
    job = db.query(Job).filter(Job.id == job_id).one_or_none()
    if not job or job.status not in {JobStatus.published, JobStatus.offer_received}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Published job not found")
    if job.customer_id == user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Customer cannot offer on own job")
    if user.role not in {UserRole.contractor, UserRole.both, UserRole.admin}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Contractor role required")

    existing = db.query(Offer).filter(Offer.job_id == job.id, Offer.contractor_id == user.id).one_or_none()
    if existing:
        existing.price = payload.price
        existing.eta = payload.eta
        existing.text = payload.text
        offer = existing
    else:
        offer = Offer(job_id=job.id, contractor_id=user.id, price=payload.price, eta=payload.eta, text=payload.text, target_lang="ru")
        db.add(offer)
    job.status = JobStatus.offer_received
    db.commit()
    db.refresh(offer)
    customer = db.get(User, job.customer_id)
    if customer:
        create_notification(db, user=customer, kind="new_offer", payload={"job_id": job.id, "offer_id": offer.id})
    audit(db, actor=user, action="offer.created", entity_type="offer", entity_id=offer.id, payload={"job_id": job.id})
    return offer


@router.post("/{job_id}/complete", response_model=JobOut)
def complete_job(job_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)) -> Job:
    job = _owned_job(db, job_id, user)
    if job.status not in {JobStatus.assigned, JobStatus.in_progress}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only assigned jobs can be completed")
    job.status = JobStatus.completed
    db.commit()
    db.refresh(job)
    audit(db, actor=user, action="job.completed", entity_type="job", entity_id=job.id)
    return job


@router.post("/{job_id}/ratings", response_model=RatingOut)
def rate_job(job_id: int, payload: RatingIn, db: Session = Depends(get_db), user: User = Depends(current_user)) -> Rating:
    job = _visible_job(db, job_id, user)
    if job.status != JobStatus.completed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only completed jobs can be rated")
    offer = db.get(Offer, job.selected_offer_id) if job.selected_offer_id else None
    if not offer:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No selected contractor")
    reviewee_id = offer.contractor_id if user.id == job.customer_id else job.customer_id
    rating = Rating(job_id=job.id, reviewer_id=user.id, reviewee_id=reviewee_id, score=payload.score, comment=payload.comment)
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating


def _owned_job(db: Session, job_id: int, user: User) -> Job:
    job = db.query(Job).filter(Job.id == job_id, Job.customer_id == user.id).one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


def _visible_job(db: Session, job_id: int, user: User) -> Job:
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.customer_id == user.id:
        return job
    offer = db.query(Offer).filter(Offer.job_id == job.id, Offer.contractor_id == user.id).one_or_none()
    if offer:
        return job
    if job.status in {JobStatus.published, JobStatus.offer_received} and user.role in {UserRole.contractor, UserRole.both, UserRole.admin}:
        return job
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Job is not visible")


def _matching_contractors(db: Session, job: Job) -> list[User]:
    candidates = (
        db.query(User)
        .join(ContractorProfile, ContractorProfile.user_id == User.id)
        .filter(User.city == job.city)
        .filter(User.is_blocked.is_(False))
        .filter(ContractorProfile.is_active.is_(True))
        .limit(50)
        .all()
    )
    return [user for user in candidates if not user.contractor_profile.categories or job.category in user.contractor_profile.categories]
