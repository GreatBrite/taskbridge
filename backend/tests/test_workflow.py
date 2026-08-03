from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def headers(telegram_id: int) -> dict[str, str]:
    return {"Authorization": f"dev {telegram_id}"}


def test_customer_contractor_offer_chat_message_flow() -> None:
    with TestClient(app) as client:
        contractor = client.post("/api/auth/telegram", json={"dev_telegram_id": 2002, "first_name": "Contractor"}).json()
        client.patch(
            "/api/me",
            headers=headers(2002),
            json={
                "role": "contractor",
                "city": "Tbilisi",
                "language_code": "ka",
                "contractor_profile": {"categories": ["moving"], "districts": [], "languages": ["ka", "ru"], "description": "Van", "is_active": True},
            },
        )
        customer = client.post("/api/auth/telegram", json={"dev_telegram_id": 1001, "first_name": "Customer"}).json()

        draft = client.post(
            "/api/jobs/draft",
            headers=headers(1001),
            json={
                "category": "moving",
                "description": "Нужно перевезти 8 коробок и небольшой стол, есть лифт и нужна машина.",
                "district": "Сабуртало",
                "time_window": "Завтра после 14:00",
                "budget": "до 120 GEL",
            },
        )
        assert draft.status_code == 200
        job_id = draft.json()["id"]

        brief = client.post(f"/api/jobs/{job_id}/brief", headers=headers(1001)).json()
        assert brief["structured_brief"]["category"] == "moving"

        published = client.post(f"/api/jobs/{job_id}/publish", headers=headers(1001))
        assert published.json()["status"] == "published"

        feed = client.get("/api/jobs/feed", headers=headers(2002)).json()
        assert any(job["id"] == job_id for job in feed)

        offer = client.post(
            f"/api/jobs/{job_id}/offers",
            headers=headers(2002),
            json={"price": "100 GEL", "eta": "15:00", "text": "Могу приехать с машиной."},
        )
        assert offer.status_code == 200
        offer_id = offer.json()["id"]

        chat = client.post(f"/api/offers/{offer_id}/select", headers=headers(1001))
        assert chat.status_code == 200
        chat_id = chat.json()["id"]

        message = client.post(f"/api/chats/{chat_id}/messages", headers=headers(1001), json={"text": "Жду у подъезда."})
        assert message.status_code == 200
        assert message.json()["target_lang"] == "ka"

        forbidden = client.get(f"/api/chats/{chat_id}/messages", headers=headers(9999))
        assert forbidden.status_code == 403

        assert customer["telegram_id"] == 1001
        assert contractor["telegram_id"] == 2002
