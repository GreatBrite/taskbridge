import hashlib
import hmac
import json
from urllib.parse import urlencode

from app.security import validate_telegram_init_data


def signed_init_data(bot_token: str, payload: dict[str, str]) -> str:
    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(payload.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    payload["hash"] = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    return urlencode(payload)


def test_validate_telegram_init_data_accepts_valid_signature() -> None:
    init_data = signed_init_data(
        "secret-token",
        {"auth_date": "123", "query_id": "q1", "user": json.dumps({"id": 42, "first_name": "Slava"})},
    )

    parsed = validate_telegram_init_data(init_data, "secret-token")

    assert parsed["user"]["id"] == 42


def test_validate_telegram_init_data_rejects_forged_signature() -> None:
    init_data = signed_init_data(
        "secret-token",
        {"auth_date": "123", "query_id": "q1", "user": json.dumps({"id": 42})},
    ).replace("42", "43")

    try:
        validate_telegram_init_data(init_data, "secret-token")
    except ValueError as exc:
        assert "Invalid Telegram signature" in str(exc)
    else:
        raise AssertionError("forged initData must be rejected")
