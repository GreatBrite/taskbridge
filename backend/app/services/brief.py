from app.config import Settings


CATEGORY_LABELS = {
    "moving": "Помощь с переездом",
    "handyman": "Муж на час",
    "childcare": "Няня",
    "dogwalk": "Выгул собак",
    "cleaning": "Уборка",
}


def build_brief(
    *,
    category: str,
    description: str,
    city: str,
    district: str,
    time_window: str,
    budget: str,
    settings: Settings,
) -> dict[str, object]:
    missing_fields: list[str] = []
    if not district:
        missing_fields.append("district")
    if not time_window:
        missing_fields.append("time_window")
    if not budget:
        missing_fields.append("budget")
    if len(description.strip()) < 60:
        missing_fields.append("details")

    title = _title_from_description(category, description)
    structured_brief = {
        "category": category,
        "category_label": CATEGORY_LABELS.get(category, category),
        "title": title,
        "description": description.strip(),
        "city": city or settings.default_city,
        "district": district,
        "time_window": time_window,
        "budget": budget,
        "currency": settings.default_currency,
        "site_conditions": _infer_conditions(description),
        "acceptance_criteria": "Исполнитель подтверждает цену, время, что привезёт с собой, и заказчик закрывает работу после проверки результата.",
    }
    score = min(96, 42 + (len(structured_brief["description"]) > 60) * 16 + (4 - len(missing_fields)) * 10)
    questions = [_question_for(field) for field in missing_fields]
    return {"title": title, "structured_brief": structured_brief, "missing_fields": missing_fields, "score": score, "questions": questions}


def _title_from_description(category: str, description: str) -> str:
    words = description.strip().replace("\n", " ").split()
    title = " ".join(words[:6]).strip(".,")
    if title:
        return title[:96]
    return CATEGORY_LABELS.get(category, "Заявка")


def _infer_conditions(description: str) -> list[str]:
    lowered = description.lower()
    conditions = []
    for keyword in ["лифт", "парков", "инструмент", "фото", "машин", "ремн", "дет", "живот"]:
        if keyword in lowered:
            conditions.append(keyword)
    return conditions


def _question_for(field: str) -> str:
    return {
        "district": "В каком районе или по какому адресу нужна работа?",
        "time_window": "Когда удобно выполнить задачу и есть ли жёсткий дедлайн?",
        "budget": "Какой максимальный бюджет или ожидаемый диапазон цены?",
        "details": "Какие условия на месте должен знать исполнитель до отклика?",
    }[field]
