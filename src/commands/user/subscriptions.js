import 'dotenv/config'
import { Composer, InlineKeyboard } from 'grammy'
import {
  createSubscription,
  createUser,
  getChatSubscriptions
} from '../../db/index.js'
import {
  brands,
  brandsKeyboard,
  confirmKeyboard,
  sexes,
  sexKeyboard,
  sizeKeyboard,
  sizes
} from '../../keyboards/index.js'

const composer = new Composer()

const helpText =
  'Бот с лучшими предложениями на беговые кроссовки 👟\n\n' +
  'Доступные команды:\n' +
  '/calculate_price - рассчитать цену с сайта Tradeinn\n' +
  '/subscribe - добавить подписку\n' +
  '/my_subscriptions - показать текущие подписки\n' +
  '/unsubscribe - отписаться от рассылки\n\n' +
  'Что-то не получается? Обратись в тех. поддержку, разберемся: @djull_zzz'

composer.command('start', async (ctx) => {
  await ctx.reply(helpText)

  const { id, username, first_name, last_name } = ctx.from
  await createUser(
    id,
    ctx.chatId,
    username,
    `${first_name} ${last_name}`.trim()
  )
})

composer.command('subscribe', async (ctx) => {
  if (process.env.ADMIN_ID === ctx.from.id.toString()) {
    return await ctx.reply(
      'Вы администратор. Подписаться на рассылку может только обычный пользователь 👀'
    )
  }

  await ctx.reply(
    'Чтобы подписаться на рассылку, нужно указать бренд кроссовок, пол и размер.\n\nВыберите один или несколько брендов и нажмите кноку Подтвердить:',
    { reply_markup: brandsKeyboard }
  )
})

composer.callbackQuery(
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

composer.callbackQuery(
  sexes.map(({ data }) => data),
  async (ctx) => {
    const { label } = sexes.find(({ data }) => data === ctx.match)
    ctx.session.sex = label
    await ctx.reply(
      'Осталось определиться с размером. Нужно указать длину стопы в сантиметрах. Можно выбрать несколько значений:',
      { reply_markup: sizeKeyboard }
    )
    await ctx.answerCallbackQuery()
  }
)

composer.callbackQuery(
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

composer.callbackQuery('confirm', async (ctx) => {
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
      'Осталось определиться с размером. Нужно указать длину стопы в сантиметрах. Можно выбрать несколько значений:',
      { reply_markup: sizeKeyboard }
    )
  } else if (brands.length) {
    await ctx.reply('Отлично! Выберите пол:', { reply_markup: sexKeyboard })
  }
  await ctx.answerCallbackQuery()
})

composer.command('my_subscriptions', async (ctx) => {
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

composer.command('unsubscribe', async (ctx) => {
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

composer.command('help', async (ctx) => {
  await ctx.reply(helpText)
})

export default composer
