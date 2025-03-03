import 'dotenv/config'
import { Bot, GrammyError, HttpError, InlineKeyboard, session } from 'grammy'
import {
  createSubscription,
  createUser,
  deleteSubscription,
  deleteChatSubscriptions,
  getSubscriptionChats,
  getSubscriptions,
  getUsers,
  getChatSubscriptions,
  initDatabase
} from './db/index.js'
import {
  brands,
  brandsKeyboard,
  confirmKeyboard,
  contactKeyboard,
  postKeyboard,
  sexes,
  sexKeyboard,
  sizeKeyboard,
  sizes
} from './keyboards/index.js'

await initDatabase()

const bot = new Bot(process.env.BOT_TOKEN)

bot.use(
  session({
    initial: () => ({
      brands: [],
      sex: null,
      sizes: [],
      message: null
    })
  })
)

bot.start()

bot.api.setMyCommands([
  { command: 'subscribe', description: 'Добавить подписку' },
  { command: 'my_subscriptions', description: 'Показать текущие подписки' },
  { command: 'unsubscribe', description: 'Отписаться от рассылки' },
  { command: 'help', description: 'Ничего не понимаю 🥲' }
])

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

const helpText =
  'Бот с лучшими предложениями на беговые кроссовки 👟\n\n' +
  'Доступные команды:\n' +
  '/subscribe - добавить подписку\n' +
  '/my_subscriptions - показать текущие подписки\n' +
  '/unsubscribe - отписаться от рассылки\n\n' +
  'Что-то не получается? Обратись в тех. поддержку, разберемся: @djull_zzz'

bot.command('start', async (ctx) => {
  await ctx.reply(helpText)

  const { id, username, first_name, last_name } = ctx.from
  await createUser(
    id,
    ctx.chatId,
    username,
    `${first_name} ${last_name}`.trim()
  )
})

bot.command('subscribe', async (ctx) => {
  if (process.env.ADMIN_ID === ctx.from.id.toString()) {
    await ctx.reply(
      'Вы администратор. Подписаться на рассылку может только обычный пользователь 👀'
    )
    return
  }

  await ctx.reply(
    'Чтобы подписаться на рассылку, нужно указать бренд кроссовок, пол и размер.\n\nВыберите один или несколько брендов и нажмите кноку Подтвердить:',
    { reply_markup: brandsKeyboard }
  )
})

bot.callbackQuery(
  brands.map(({ data }) => data),
  async (ctx) => {
    const { label } = brands.find(({ data }) => data === ctx.match)

    if (!ctx.session.brands.includes(label)) {
      ctx.session.brands.push(label)
    }
    await ctx.reply(
      `Вы выбрали следующие бренды: ${ctx.session.brands.join(', ')}. Выберите еще один бренд или нажмите кнопку Подтвердить.`,
      { reply_markup: confirmKeyboard }
    )
    await ctx.answerCallbackQuery()
  }
)

bot.callbackQuery(
  sexes.map(({ data }) => data),
  async (ctx) => {
    const { label } = sexes.find(({ data }) => data === ctx.match)
    ctx.session.sex = label
    await ctx.reply(
      'Осталось определиться с размером. Можно выбрать несколько:',
      { reply_markup: sizeKeyboard }
    )
    await ctx.answerCallbackQuery()
  }
)

bot.callbackQuery(
  sizes.map(({ data }) => data),
  async (ctx) => {
    const { label } = sizes.find(({ data }) => data === ctx.match)

    if (!ctx.session.sizes.includes(label)) {
      ctx.session.sizes.push(label)
    }
    await ctx.reply(
      `Вы выбрали следующие размеры: ${ctx.session.sizes.join('; ')}. Выберите еще один размер или нажмите кнопку Подтвердить.`,
      { reply_markup: confirmKeyboard }
    )
    await ctx.answerCallbackQuery()
  }
)

bot.callbackQuery('confirm', async (ctx) => {
  const { brands, sex, sizes } = ctx.session
  if (sizes.length) {
    if (process.env.ADMIN_ID === ctx.from.id.toString()) {
      await ctx.reply(
        `Данные успешно собраны.\n\nБренд: ${ctx.session.brands.join('; ')}\nРазмер: ${ctx.session.sizes.join('; ')}\nПол: ${ctx.session.sex}\n\nВведите сообщение для рассылки или отправьте команду /clear для очистки данных.`
      )
      await ctx.answerCallbackQuery()
      return
    }

    brands.forEach((brand) => {
      sizes.forEach(async (size) => {
        await createSubscription(ctx.chatId, sex, brand, size)
      })
    })

    await ctx.reply('Подписка успешно оформлена!')
    ctx.session = {
      brands: [],
      sex: null,
      sizes: [],
      message: null
    }
  } else if (sex) {
    await ctx.reply(
      'Осталось определиться с размером. Можно выбрать несколько:',
      { reply_markup: sizeKeyboard }
    )
  } else if (brands.length) {
    await ctx.reply('Отлично! Выберите пол:', { reply_markup: sexKeyboard })
  }
  await ctx.answerCallbackQuery()
})

bot.command('my_subscriptions', async (ctx) => {
  if (process.env.ADMIN_ID === ctx.from.id.toString()) {
    await ctx.reply(
      'Для просмотра текущих подписок используйте команду /subscriptions'
    )
    return
  }

  const subscriptions = (await getChatSubscriptions(ctx.chatId))
    .map(({ sex, brand, size }, index) => {
      return `${index + 1}) ${brand} ${size} ${sex}`
    })
    .join('\n\n')

  await ctx.reply(
    subscriptions ||
      'У вас нет текущих подписок.\n\nЧтобы подписаться на рассылку отправьте команду /subscribe'
  )
})

bot.command('unsubscribe', async (ctx) => {
  if (process.env.ADMIN_ID === ctx.from.id.toString()) {
    await ctx.reply(
      'Вы администратор. Отписаться от рассылки может только обычный пользователь 👀'
    )
    return
  }

  const subscriptions = (await getChatSubscriptions(ctx.chatId)).map(
    ({ sex, brand, size }) => {
      return `${brand} ${size} ${sex}`
    }
  )

  const subscriptionsKeyboard = subscriptions.reduce(
    (result, label, index) => result.text(label, `unsubscribe_${index}`).row(),
    new InlineKeyboard()
  )
  subscriptionsKeyboard.text('Отписаться от всех', 'unsubscribe_all')

  await ctx.reply(`Выберите рассылку, от которой хотите отписаться:`, {
    reply_markup: subscriptionsKeyboard
  })
})

bot.command('help', async (ctx) => {
  await ctx.reply(helpText)
})

bot.command('post', async (ctx) => {
  if (ctx.from.id.toString() !== process.env.ADMIN_ID) {
    await ctx.reply('Не только лишь каждый способен выполнить эту команду.')
    return
  }

  await ctx.reply(
    'Чтобы отправить рассылку, нужно указать бренд кроссовок, пол и размер.\n\nВыберите один или несколько брендов и нажмите кноку Подтвердить:',
    { reply_markup: brandsKeyboard }
  )
})

bot.command('subscriptions', async (ctx) => {
  if (
    ![process.env.ADMIN_ID, process.env.TECH_SUPPORT_ID].includes(
      ctx.from.id.toString()
    )
  ) {
    await ctx.reply(
      'Для просмотра текущих подписок отправьте команду /my_subscriptions'
    )
    return
  }

  const subscriptions = (await getSubscriptions())
    .map(({ sex, brand, size }, index) => {
      return `${index + 1}) ${brand} ${size} ${sex}`
    })
    .join('\n')

  await ctx.reply(subscriptions || 'Нет текущих подписок.')
})

bot.command('users', async (ctx) => {
  if (
    ![process.env.ADMIN_ID, process.env.TECH_SUPPORT_ID].includes(
      ctx.from.id.toString()
    )
  ) {
    await ctx.reply('Не только лишь каждый способен выполнить эту команду.')
    return
  }

  const users = (await getUsers())
    .map(({ name, username }, index) => `${index + 1}) ${name} (@${username})`)
    .join('\n')
  await ctx.reply(users)
})

bot.command('clear', async (ctx) => {
  if (ctx.from.id.toString() !== process.env.ADMIN_ID) {
    await ctx.reply('Не только лишь каждый способен выполнить эту команду.')
    return
  }

  ctx.session = {
    brands: [],
    sex: null,
    sizes: [],
    message: null
  }
  await ctx.reply(
    'Начнем сначала?\n\nДля отправки рассылки воспользуйтесь командой /post'
  )
})

bot.on('message', async (ctx) => {
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
      await ctx.api.sendPhoto(user.chat_id, message.photo, {
        caption: message.caption,
        reply_markup: contactKeyboard
      })
      await ctx.api.send
    }
    if (message.text) {
      await ctx.api.sendMessage(user.chat_id, message.text, {
        reply_markup: contactKeyboard
      })
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
