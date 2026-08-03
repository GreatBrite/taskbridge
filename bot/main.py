import asyncio
import logging

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo
from pydantic_settings import BaseSettings, SettingsConfigDict


class BotSettings(BaseSettings):
    telegram_bot_token: str = ""
    mini_app_url: str = "https://taskbridge.zavozikkvn.ru/"
    backend_url: str = "http://backend:8000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = BotSettings()
dispatcher = Dispatcher()


def mini_app_keyboard(start_param: str = "") -> InlineKeyboardMarkup:
    url = settings.mini_app_url
    if start_param:
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}startapp={start_param}"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Открыть DeloLynk", web_app=WebAppInfo(url=url))],
        ]
    )


@dispatcher.message(CommandStart())
async def start(message: Message) -> None:
    await message.answer(
        "DeloLynk помогает найти исполнителя для бытовой задачи и общаться без языкового барьера.",
        reply_markup=mini_app_keyboard(),
    )


@dispatcher.message(F.text)
async def fallback(message: Message) -> None:
    await message.answer("Открой mini-app, чтобы создать заявку, откликнуться или перейти в чат.", reply_markup=mini_app_keyboard())


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is required to run the bot")
    bot = Bot(settings.telegram_bot_token)
    await dispatcher.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
