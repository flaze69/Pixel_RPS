"""
Pixel RPS Duel - Telegram Bot Server Template
Demonstrates:
1. Sending WebApp game launcher buttons
2. Deep-linking for 2-player multiplayer room matchmaking
3. Handling Telegram Stars (XTR) payments for game tickets / bets
"""

import os
import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart, Command
from aiogram.types import (
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
    LabeledPrice,
    PreCheckoutQuery
)

# Replace with your Telegram Bot Token from @BotFather
BOT_TOKEN = os.getenv("BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
# Replace with your deployed GitHub Pages URL or ngrok URL
GAME_WEBAPP_URL = os.getenv("GAME_URL", "https://your-username.github.io/TeleGame/")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(CommandStart())
async def start_handler(message: types.Message):
    # Check if user joined via room deep-link: /start room_123456
    args = message.text.split(maxsplit=1)
    room_param = args[1] if len(args) > 1 else ""

    game_url = GAME_WEBAPP_URL
    if room_param:
        game_url = f"{GAME_WEBAPP_URL}?room={room_param.replace('room_', '')}"

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="⚔️ ГРАТИ В PIXEL RPS DUEL",
                web_app=WebAppInfo(url=game_url)
            )
        ],
        [
            InlineKeyboardButton(
                text="⭐ КУПИТИ 50 STARS (КВИТОК)",
                callback_data="buy_stars_ticket"
            )
        ]
    ])

    await message.answer(
        "🎮 <b>Ласкаво просимо в PIXEL RPS DUEL!</b>\n\n"
        "8-бітний ретро-файтинг «Камінь • Ножиці • Папір» прямо в Telegram:\n"
        "• Бій проти піксельного штучного інтелекту\n"
        "• Дуель удвох на одному екрані (Hotseat)\n"
        "• Онлайн PvP з друзями в реальному часі!\n\n"
        "Тисни кнопку нижче, щоб розпочати битву:",
        reply_markup=keyboard,
        parse_mode="HTML"
    )

@dp.callback_query(lambda c: c.data == "buy_stars_ticket")
async def process_stars_invoice(callback: types.CallbackQuery):
    # Telegram Stars invoice (currency="XTR")
    prices = [LabeledPrice(label="50 Stars Ігровий Квиток", amount=50)]

    await bot.send_invoice(
        chat_id=callback.from_user.id,
        title="Турнірний квиток PIXEL DUEL",
        description="Квиток для участі в дуелях на зірки Telegram",
        payload="ticket_50_stars",
        currency="XTR",  # Official Telegram Stars currency code
        prices=prices,
        provider_token="" # Empty string for Telegram Stars
    )
    await callback.answer()

@dp.pre_checkout_query()
async def process_pre_checkout(pre_checkout_query: PreCheckoutQuery):
    # Confirm order
    await bot.answer_pre_checkout_query(pre_checkout_query.id, ok=True)

@dp.message(lambda m: m.successful_payment is not None)
async def process_successful_payment(message: types.Message):
    await message.answer(
        " Оплата <b>Telegram Stars</b> успішна!\n"
        "Ваш баланс поповнено. Бажаємо перемоги в дуелях!",
        parse_mode="HTML"
    )

async def main():
    if BOT_TOKEN == "YOUR_BOT_TOKEN_HERE":
        print("[!] Вкажіть дійсний BOT_TOKEN перед запуском бота.")
        return
    print("Бот запущено...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
