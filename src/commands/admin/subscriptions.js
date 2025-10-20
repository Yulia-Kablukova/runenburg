import 'dotenv/config'
import { Composer } from 'grammy'
import { ADMINS } from '../../constants/index.js'
import { brands, brandsKeyboard, sizes } from '../../keyboards/index.js'
import { getSubscriptions, getUsers } from '../../db/index.js'

const composer = new Composer()

const adminHelpText =
  'Доступные команды администратора:\n' +
  '/post - создать рассылку\n' +
  '/clear - очистить данные при создании рассылки\n' +
  '/subscriptions - список всех подписок\n' +
  '/users - список всех пользователей\n' +
  '/set_rate - установить курс евро\n' +
  '/get_rate - посмотреть текущий курс\n' +
  '/set_commission - установить процент комиссии\n' +
  '/get_commission - посмотреть текущую комиссию'

composer.command('admin', async (ctx) => {
  if (!ADMINS.includes(ctx.from.id.toString())) {
    return await ctx.reply('Недостаточно прав. Какие у вас документы?')
  }
  await ctx.reply(adminHelpText)
})

composer.command('post', async (ctx) => {
  if (ctx.from.id.toString() !== process.env.ADMIN_ID) {
    return await ctx.reply('Недостаточно прав. Какие у вас документы?')
  }

  await ctx.reply(
    'Чтобы отправить рассылку, нужно указать бренд кроссовок, пол и размер.\n\nВыберите один или несколько брендов и нажмите кноку Подтвердить:',
    { reply_markup: brandsKeyboard }
  )
})

composer.command('subscriptions', async (ctx) => {
  if (!ADMINS.includes(ctx.from.id.toString())) {
    return await ctx.reply(
      'Для просмотра текущих подписок отправьте команду /my_subscriptions'
    )
  }

  const subscriptions = (await getSubscriptions()).reduce(
    (result, { sex, brand, size }) => {
      const brandKey = brands.find(({ label }) => label === brand).data
      const sexKey = sex === 'Мужской' ? 'male' : 'female'
      const sizeKey = sizes.find(({ label }) => label === size).data
      const count = result[brandKey]?.[sexKey]?.[sizeKey] || 0

      Object.assign(result, {
        [brandKey]: {
          ...result[brandKey],
          [sexKey]: {
            ...result[brandKey]?.[sexKey],
            [sizeKey]: count + 1
          }
        }
      })

      return result
    },
    {}
  )

  if (!Object.values(subscriptions).length) {
    await ctx.reply('Нет текущих подписок.')
  }

  for (const [brandKey, brandValue] of Object.entries(subscriptions)) {
    const brand = brands.find(({ data }) => data === brandKey).label
    let reply = ''

    if (brandValue.male) {
      reply += `${brand} М\n`
      Object.entries(brandValue.male).forEach(([sizeKey, count]) => {
        const size = sizes.find(({ data }) => data === sizeKey).label
        reply += `${size}: ${count}\n`
      })
      reply += '\n'
    }

    if (brandValue.female) {
      reply += `${brand} Ж\n`
      Object.entries(brandValue.female).forEach(([sizeKey, count]) => {
        const size = sizes.find(({ data }) => data === sizeKey).label
        reply += `${size}: ${count}\n`
      })
    }

    await ctx.reply(reply)
  }
})

composer.command('users', async (ctx) => {
  if (!ADMINS.includes(ctx.from.id.toString())) {
    await ctx.reply('Недостаточно прав. Какие у вас документы?')
    return
  }

  const users = (await getUsers()).map(
    ({ name, username }, index) =>
      `${index + 1}) ${name.replace('undefined', '')} (@${username})`
  )

  for (let i = 0; i < users.length; i += 100) {
    await ctx.reply(users.slice(i, i + 100).join('\n'))
  }
})

composer.command('clear', async (ctx) => {
  if (ctx.from.id.toString() !== process.env.ADMIN_ID) {
    await ctx.reply('Недостаточно прав. Какие у вас документы?')
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

export default composer
