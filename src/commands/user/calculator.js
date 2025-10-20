import 'dotenv/config'
import { Composer } from 'grammy'

const composer = new Composer()

composer.command('calculate_price', async (ctx) => {
  ctx.session.command = 'calculate_price'
  await ctx.reply(
    'На сайте https://www.tradeinn.com/runnerinn/ru выберите страну Армения и найдите товар. Отправьте его цену без доставки.',
    {
      link_preview_options: { is_disabled: true }
    }
  )
})

export default composer
