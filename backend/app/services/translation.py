import hashlib

import httpx
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import JobTranslation


async def translate_text(text: str, target_lang: str, settings: Settings) -> tuple[str, str]:
    clean_text = text.strip()
    if not clean_text:
        return "", "none"
    if not settings.deepl_api_key:
        return f"[{target_lang.upper()}] {clean_text}", "mock"

    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.post(
            "https://api-free.deepl.com/v2/translate",
            data={"auth_key": settings.deepl_api_key, "text": clean_text, "target_lang": target_lang.upper()},
        )
        response.raise_for_status()
        payload = response.json()
    return payload["translations"][0]["text"], "deepl"


def stable_translation_key(text: str, target_lang: str) -> str:
    return hashlib.sha256(f"{target_lang}:{text}".encode()).hexdigest()


def upsert_job_translation(
    db: Session,
    *,
    job_id: int,
    target_lang: str,
    translated_title: str,
    translated_brief: str,
    provider: str,
) -> JobTranslation:
    translation = db.query(JobTranslation).filter(JobTranslation.job_id == job_id, JobTranslation.target_lang == target_lang).one_or_none()
    if translation:
        translation.translated_title = translated_title
        translation.translated_brief = translated_brief
        translation.provider = provider
    else:
        translation = JobTranslation(
            job_id=job_id,
            target_lang=target_lang,
            translated_title=translated_title,
            translated_brief=translated_brief,
            provider=provider,
        )
        db.add(translation)
    db.commit()
    db.refresh(translation)
    return translation
