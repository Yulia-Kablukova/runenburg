import 'dotenv/config'
import { Bot, GrammyError, HttpError, session } from 'grammy'
import {
  deleteSubscription,
  deleteChatSubscriptions,
  getSubscriptionChats,
  getChatSubscriptions,
  initDatabase,
  getSetting,
  updateSetting
} from './db/index.js'
import { contactKeyboard, postKeyboard } from './keyboards/index.js'
import user_subscriptions from './commands/user/subscriptions.js'
import user_calculator from './commands/user/calculator.js'
import admin_subscriptions from './commands/admin/subscriptions.js'
import admin_calculator from './commands/admin/calculator.js'

await initDatabase()

const bot = new Bot(process.env.BOT_TOKEN)

bot.use(
  session({
    initial: () => ({
      brands: [],
      sex: null,
      sizes: [],
      message: null,
      command: null,
      price: null
    })
  })
)

bot.use(user_subscriptions)
bot.use(admin_subscriptions)
bot.use(user_calculator)
bot.use(admin_calculator)

bot.start()

bot.api.setMyCommands(
  [
    {
      command: 'calculate_price',
      description: 'Рассчитать цену с сайта Tradeinn'
    },
    { command: 'subscribe', description: 'Добавить подписку' },
    { command: 'my_subscriptions', description: 'Показать текущие подписки' },
    { command: 'unsubscribe', description: 'Отписаться от рассылки' },
    { command: 'help', description: 'Ничего не понимаю 🥲' }
  ],
  {
    scope: { type: 'all_private_chats' }
  }
)

bot.catch((err) => {
  const ctx = err.ctx
  console.error(`Error while handling update ${ctx.update.update_id}:`)

  const e = err.error
  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description)
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e)
  } else {
    console.error('Unknown error:', e)
  }
})

bot.on('message', async (ctx) => {
  if (ctx.session.command === 'set_rate') {
    const newRate = parseFloat(ctx.msg.text)
    if (isNaN(newRate)) {
      return await ctx.reply('Неверный формат 💔\nПример: 100.02')
    }

    await updateSetting('rate', newRate)
    ctx.session.command = null
    return await ctx.reply(`Как скажешь! Установлен курс ${newRate}.`)
  }

  if (ctx.session.command === 'set_commission') {
    const newCommission = parseFloat(ctx.msg.text)
    if (isNaN(newCommission)) {
      return await ctx.reply('Неверный формат 💔\nПример: 100.02')
    }

    await updateSetting('commission', newCommission)
    ctx.session.command = null
    return await ctx.reply(`Готово! Новая комиссия ${newCommission}%.`)
  }

  if (ctx.session.command === 'calculate_price') {
    const price = parseFloat(ctx.msg.text)
    if (isNaN(price)) {
      return await ctx.reply('Неверный формат 💔\nПример: 102.99')
    }
    ctx.session.command = 'calculate_price_2'
    ctx.session.price = price
    return await ctx.reply(
      'Ок! Теперь добавьте товар в корзину и перейдите в нее. Отправьте минимальную цену доставки из предложенных вариантов.'
    )
  }

  if (ctx.session.command === 'calculate_price_2') {
    const delivery = parseFloat(ctx.msg.text)
    if (isNaN(delivery)) {
      return await ctx.reply('Неверный формат 💔\nПример: 40.99')
    }
    const rate = await getSetting('rate')
    const commission = await getSetting('commission')
    const result =
      Math.ceil(
        ((ctx.session.price + delivery / 2) *
          1.1 *
          rate *
          (1 + commission / 100)) /
          100
      ) * 100
    ctx.session.command = null
    ctx.session.price = null
    return await ctx.reply(
      `Итоговая цена с доставкой в РФ: ${result} руб.\nДля заказа обращайтесь к @temchik05. Приятных покупок!`
    )
  }

  if (ctx.from.id.toString() !== process.env.ADMIN_ID) {
    await ctx.reply(
      'Кажется, мы потеряли нить диалога 💔\n\nВоспользуйтесь командой /help или обратитесь в тех. поддержку (контакт в описании профиля).'
    )
    return
  }

  const { brands, sex, sizes } = ctx.session
  if (sizes.length && sex && brands) {
    ctx.session.message = ctx.msg
    await ctx.reply('Сообщение готово к публикации. Выберите действие:', {
      reply_markup: postKeyboard
    })
  } else {
    await ctx.reply('Для отправки рассылки воспользуйтесь командой /post')
  }
})

bot.callbackQuery('clear_message', async (ctx) => {
  ctx.session.message = null
  await ctx.reply('Введите сообщение заново.')
  await ctx.answerCallbackQuery()
})

bot.callbackQuery('send', async (ctx) => {
  const { sex, brands, sizes, message } = ctx.session

  if (!message) {
    await ctx.reply('Отсутствует сообщение для отправки.')
    await ctx.answerCallbackQuery()
    return
  }

  const users = await getSubscriptionChats(sex, brands, sizes)

  for (const user of users) {
    if (message.photo) {
      try {
        await ctx.api.sendPhoto(
          user.chat_id,
          message.photo[message.photo.length - 1].file_id,
          {
            caption: message.caption,
            reply_markup: contactKeyboard
          }
        )
      } catch (e) {
        console.log(e + ' from ' + user)
      }
    }
    if (message.text) {
      try {
        await ctx.api.sendMessage(user.chat_id, message.text, {
          reply_markup: contactKeyboard
        })
      } catch (e) {
        console.log(e + ' from ' + user)
      }
    }
  }

  ctx.session = {
    brands: [],
    sex: null,
    sizes: [],
    message: null
  }
  await ctx.reply('Рассылка успешно отправлена ❤️')
  await ctx.answerCallbackQuery()
})

bot.on('callback_query:data', async (ctx) => {
  const button = ctx.callbackQuery.data

  if (button === 'unsubscribe_all') {
    await deleteChatSubscriptions(ctx.chatId)
    await ctx.reply(`Вы успешно отписались от всех рассылок`)
  } else if (button.startsWith('unsubscribe')) {
    const index = button.match(/\d+/)[0]
    const subscriptions = await getChatSubscriptions(ctx.chatId)

    if (index && index < subscriptions.length) {
      await deleteSubscription(subscriptions[index].id)
    }
    await ctx.reply(`Вы успешно отписались от рассылки`)
  }

  await ctx.answerCallbackQuery()
})

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
