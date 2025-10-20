import 'dotenv/config'
import { Composer } from 'grammy'
import { ADMINS } from '../../constants/index.js'
import { getSetting } from '../../db/index.js'

const composer = new Composer()

composer.command('set_rate', async (ctx) => {
  if (!ADMINS.includes(ctx.from.id.toString())) {
    await ctx.reply('Недостаточно прав. Какие у вас документы?')
    return
  }

  ctx.session.command = 'set_rate'
  await ctx.reply('Укажите актуальный курс евро.')
})

composer.command('get_rate', async (ctx) => {
  if (!ADMINS.includes(ctx.from.id.toString())) {
    await ctx.reply('Недостаточно прав. Какие у вас документы?')
    return
  }

  await ctx.reply(
    `Курс евро: ${await getSetting('rate')}. Для смены курса отправьте команду /set_rate`
  )
})

composer.command('set_commission', async (ctx) => {
  if (!ADMINS.includes(ctx.from.id.toString())) {
    await ctx.reply('Недостаточно прав. Какие у вас документы?')
    return
  }

  ctx.session.command = 'set_commission'
  await ctx.reply('Укажите новую комиссию.')
})

composer.command('get_commission', async (ctx) => {
  if (!ADMINS.includes(ctx.from.id.toString())) {
    await ctx.reply('Недостаточно прав. Какие у вас документы?')
    return
  }

  await ctx.reply(
    `Текущая комиссия: ${await getSetting('commission')}%. Для изменения отправьте команду /set_commission`
  )
})

export default composer
