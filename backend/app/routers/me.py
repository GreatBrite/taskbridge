from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import ContractorProfile, User
from app.schemas import UserOut, UserPatch
from app.security import current_user

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=UserOut)
def read_me(user: User = Depends(current_user)) -> User:
    return user


@router.patch("", response_model=UserOut)
def patch_me(payload: UserPatch, db: Session = Depends(get_db), user: User = Depends(current_user)) -> User:
    if payload.role is not None:
        user.role = payload.role
    if payload.city is not None:
        user.city = payload.city
    if payload.language_code is not None:
        user.language_code = payload.language_code

    if payload.contractor_profile is not None:
        profile = db.query(ContractorProfile).filter(ContractorProfile.user_id == user.id).one_or_none()
        if not profile:
            profile = ContractorProfile(user_id=user.id)
            db.add(profile)
        profile.categories = payload.contractor_profile.categories
        profile.districts = payload.contractor_profile.districts
        profile.languages = payload.contractor_profile.languages
        profile.description = payload.contractor_profile.description
        profile.is_active = payload.contractor_profile.is_active

    db.commit()
    return db.query(User).options(joinedload(User.contractor_profile)).filter(User.id == user.id).one()
