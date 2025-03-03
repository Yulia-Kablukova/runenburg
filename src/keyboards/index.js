import { InlineKeyboard } from 'grammy';

export const brands = [
    { label: 'Nike', data: 'nike' },
    { label: 'Adidas', data: 'adidas' },
    { label: 'Asics', data: 'asics' },
    { label: 'New Balance', data: 'new_balance' },
    { label: 'Saucony', data: 'saucony' },
    { label: 'Brooks', data: 'brooks' },
    { label: 'Hoka', data: 'hoka' },
    { label: 'Puma', data: 'puma' },
    { label: 'Mizuno', data: 'mizuno' },
    { label: 'On Running', data: 'on_running' },
    { label: 'Salomon', data: 'salomon' },
    { label: 'Altra', data: 'altra' },
    { label: 'Anta', data: 'anta' },
    { label: 'Skechers', data: 'skechers' },
    { label: 'Bmai', data: 'bmai' },
    { label: 'Li-Ning', data: 'li_ning' },
]

export const sexes = [
    { label: 'Мужской', data: 'male' },
    { label: 'Женский', data: 'female' },
]

export const sizes = [
    { label: '22,5', data: 'size_22_5' },
    { label: '23', data: 'size_23' },
    { label: '23,5', data: 'size_23_5' },
    { label: '24', data: 'size_24' },
    { label: '24,5', data: 'size_24_5' },
    { label: '25', data: 'size_25' },
    { label: '25,25', data: 'size_25_25' },
    { label: '25,5', data: 'size_25_5' },
    { label: '25,75', data: 'size_25_75' },
    { label: '26', data: 'size_26' },
    { label: '26,5', data: 'size_26_5' },
    { label: '27', data: 'size_27' },
    { label: '27,5', data: 'size_27_5' },
    { label: '28', data: 'size_28' },
    { label: '28,25', data: 'size_28_25' },
    { label: '28,5', data: 'size_28_5' },
    { label: '29', data: 'size_29' },
    { label: '29,5', data: 'size_29_5' },
    { label: '30', data: 'size_30' },
    { label: '30,5', data: 'size_30_5' },
    { label: '31', data: 'size_31' },
    { label: '31,5', data: 'size_31_5' },
    { label: '32', data: 'size_32' },
    { label: '32,5', data: 'size_32_5' },
    { label: '33', data: 'size_33' },
    { label: '33,5', data: 'size_33_5' },
    { label: '34', data: 'size_34' },
    { label: '34,5', data: 'size_34_5' },
    { label: '35', data: 'size_35' },
]

export const brandsKeyboard = brands.reduce((result, { label, data }, index) => {
    if (index && !(index % 2)) {
        result.row()
    }
    return result.text(label, data)
}, new InlineKeyboard())

export const sexKeyboard = sexes.reduce((result, { label, data }) => result.text(label, data).row(), new InlineKeyboard())

export const sizeKeyboard = sizes.reduce((result, { label, data }, index) => {
    if (index && !(index % 3)) {
        result.row()
    }
    return result.text(label, data)
}, new InlineKeyboard())

export const confirmKeyboard = new InlineKeyboard().text('Подтвердить', 'confirm');

export const postKeyboard = new InlineKeyboard()
    .text('Изменить сообщение', 'clear_message')
    .row()
    .text('Отправить рассылку', 'send');
