from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Chat, Message, User
from app.schemas import ChatOut, MessageIn, MessageOut
from app.security import current_user
from app.services.notifications import create_notification

router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("", response_model=list[ChatOut])
def list_chats(db: Session = Depends(get_db), user: User = Depends(current_user)) -> list[Chat]:
    return (
        db.query(Chat)
        .filter((Chat.customer_id == user.id) | (Chat.contractor_id == user.id))
        .order_by(Chat.created_at.desc())
        .all()
    )


@router.get("/{chat_id}/messages", response_model=list[MessageOut])
def list_messages(chat_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)) -> list[Message]:
    chat = _visible_chat(db, chat_id, user)
    return db.query(Message).filter(Message.chat_id == chat.id).order_by(Message.created_at.asc()).all()


@router.post("/{chat_id}/messages", response_model=MessageOut)
def create_message(chat_id: int, payload: MessageIn, db: Session = Depends(get_db), user: User = Depends(current_user)) -> Message:
    chat = _visible_chat(db, chat_id, user)
    recipient_id = chat.contractor_id if user.id == chat.customer_id else chat.customer_id
    recipient = db.get(User, recipient_id)
    target_lang = recipient.language_code if recipient else "ru"
    translated = f"[{target_lang.upper()}] {payload.text}"
    message = Message(
        chat_id=chat.id,
        sender_id=user.id,
        original_text=payload.text,
        original_lang=payload.original_lang,
        translated_text=translated,
        target_lang=target_lang,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    if recipient:
        create_notification(db, user=recipient, kind="new_message", payload={"chat_id": chat.id, "message_id": message.id})
    return message


def _visible_chat(db: Session, chat_id: int, user: User) -> Chat:
    chat = db.get(Chat, chat_id)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    if user.id not in {chat.customer_id, chat.contractor_id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chat is not visible")
    return chat
