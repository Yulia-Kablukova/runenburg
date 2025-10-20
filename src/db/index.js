import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

const db = await open({
  filename: 'runenburg-db.db',
  driver: sqlite3.Database
})

export async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      chat_id INTEGER NOT NULL UNIQUE,
      username TEXT NOT NULL,
      name TEXT NOT NULL
    )
    `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      sex INTEGER NOT NULL,
      brand TEXT NOT NULL,
      size TEXT NOT NULL,
      UNIQUE (chat_id, sex, brand, size)
    )
    `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      value TEXT,
      UNIQUE (key, value)
    )
    `)
}

export async function createUser(id, chat_id, username, name) {
  await db.run(
    'INSERT OR IGNORE INTO users (id, chat_id, username, name) VALUES (?, ?, ?, ?)',
    id,
    chat_id,
    username,
    name
  )
}

export async function getUsers() {
  return await db.all('SELECT id, username, name FROM users')
}

export async function createSubscription(chat_id, sex, brand, size) {
  await db.run(
    'INSERT OR IGNORE INTO subscriptions (chat_id, sex, brand, size) VALUES (?, ?, ?, ?)',
    chat_id,
    sex,
    brand,
    size
  )
}

export async function getSubscriptions() {
  return await db.all('SELECT * FROM subscriptions')
}

export async function getSubscriptionChats(sex, brands, sizes) {
  return await db.all(
    `SELECT chat_id FROM subscriptions WHERE sex = ? AND brand IN (${brands.map(() => '?').join(',')}) AND size IN (${sizes.map(() => '?').join(',')})`,
    sex,
    ...brands,
    ...sizes
  )
}

export async function getChatSubscriptions(chat_id) {
  return await db.all(
    'SELECT * FROM subscriptions WHERE chat_id = ? ORDER BY id',
    chat_id
  )
}

export async function deleteSubscription(id) {
  await db.run('DELETE FROM subscriptions WHERE id = ?', id)
}

export async function deleteChatSubscriptions(chat_id) {
  await db.run('DELETE FROM subscriptions WHERE chat_id = ?', chat_id)
}

export async function updateSetting(key, value) {
  await db.run(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    key,
    value
  )
}

export async function getSetting(key) {
  return (await db.get(`SELECT value FROM settings WHERE key = ?`, key))?.value
}
