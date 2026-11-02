import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { Card } from './types';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// opens the local database (and creates the table the first time)
export function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('wishlink.db');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS cards (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          bg TEXT NOT NULL,
          sticker TEXT NOT NULL,
          effect TEXT NOT NULL DEFAULT 'sparkle',
          image TEXT NOT NULL DEFAULT '',
          extra TEXT NOT NULL DEFAULT '',
          updated_at INTEGER NOT NULL,
          synced INTEGER NOT NULL DEFAULT 0,
          deleted INTEGER NOT NULL DEFAULT 0,
          shared INTEGER NOT NULL DEFAULT 0
        );
      `);
      // MIGRATION: phones that already have the old table need the new "image" column added once
      const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(cards)');
      if (!cols.some((c) => c.name === 'image')) await db.execAsync("ALTER TABLE cards ADD COLUMN image TEXT NOT NULL DEFAULT ''");
      if (!cols.some((c) => c.name === 'extra')) await db.execAsync("ALTER TABLE cards ADD COLUMN extra TEXT NOT NULL DEFAULT ''");
      return db;
    })();
  }
  return dbPromise;
}

export const newId = () => Crypto.randomUUID();

// ---------- CRUD (all local, works offline) ----------
export async function listCards(userId: string) {
  const db = await getDb();
  return db.getAllAsync<Card>(
    'SELECT * FROM cards WHERE user_id = ? AND deleted = 0 ORDER BY updated_at DESC',
    [userId]
  );
}

export async function getCard(id: string) {
  const db = await getDb();
  return db.getFirstAsync<Card>('SELECT * FROM cards WHERE id = ?', [id]);
}

// create OR update: marks the card as "not synced yet"
export async function saveCard(c: {
  id: string; user_id: string; title: string; message: string;
  bg: string; sticker: string; effect: string; image?: string; extra?: string; shared?: number;
}) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO cards
     (id, user_id, title, message, bg, sticker, effect, image, extra, updated_at, synced, deleted, shared)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
    [c.id, c.user_id, c.title, c.message, c.bg, c.sticker, c.effect, c.image ?? '', c.extra ?? '', Date.now(), c.shared ?? 0]
  );
}

// soft delete: hidden now, removed from the cloud at the next sync
export async function removeCard(id: string) {
  const db = await getDb();
  await db.runAsync('UPDATE cards SET deleted = 1, synced = 0, updated_at = ? WHERE id = ?', [Date.now(), id]);
}

// ---------- Sync with Supabase (needs internet) ----------
async function pushCards(userId: string) {
  const db = await getDb();
  const pending = await db.getAllAsync<Card>('SELECT * FROM cards WHERE user_id = ? AND synced = 0', [userId]);
  for (const r of pending) {
    if (r.deleted) {
      const { error } = await supabase.from('cards').delete().eq('id', r.id);
      if (error) throw error;
      await db.runAsync('DELETE FROM cards WHERE id = ?', [r.id]);
    } else {
      const { error } = await supabase.from('cards').upsert({
        id: r.id,
        user_id: r.user_id,
        title: r.title,
        message: r.message,
        bg: r.bg,
        sticker: r.sticker,
        effect: r.effect,
        image: r.image ?? '',
        extra: r.extra ?? '',
        shared: !!r.shared,
        updated_at: new Date(r.updated_at).toISOString(),
      });
      if (error) throw error;
      await db.runAsync('UPDATE cards SET synced = 1 WHERE id = ?', [r.id]);
    }
  }
}

async function pullCards(userId: string) {
  const { data, error } = await supabase.from('cards').select('*').eq('user_id', userId);
  if (error) throw error;
  const db = await getDb();
  for (const c of data ?? []) {
    const local = await getCard(c.id);
    const cloudTime = new Date(c.updated_at).getTime();
    // take the cloud copy if we don't have it, or if it is newer and we have no pending changes
    if (!local || (local.synced === 1 && cloudTime > local.updated_at)) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cards
         (id, user_id, title, message, bg, sticker, effect, image, extra, updated_at, synced, deleted, shared)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)`,
        [c.id, c.user_id, c.title, c.message, c.bg, c.sticker, c.effect, c.image ?? '', c.extra ?? '', cloudTime, c.shared ? 1 : 0]
      );
    }
  }
}

// push local changes, then download anything new. Throws if there is no internet.
export async function syncAll(userId: string) {
  await pushCards(userId);
  await pullCards(userId);
}
