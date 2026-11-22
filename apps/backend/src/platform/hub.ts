import { DurableObject } from 'cloudflare:workers'
import type { ThreadSummary } from '@mirai/rpc'

interface Row {
  readonly [key: string]: SqlStorageValue
  readonly id: string
  readonly title: string
  readonly created_at: number
  readonly updated_at: number
  readonly last_message_at: number | null
}

const DEFAULT_TITLE = 'New chat'

/**
 * The one list of threads. Each thread owns its own `ChatAgent`; this object
 * only keeps the row the sidebar reads, so opening the app never wakes every
 * conversation.
 */
export class Hub extends DurableObject<Record<string, never>> {
  constructor(ctx: DurableObjectState, env: Record<string, never>) {
    super(ctx, env)
    void ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS threads (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          last_message_at INTEGER
        )
      `)
    })
  }

  private get sql(): SqlStorage {
    return this.ctx.storage.sql
  }

  list(): ReadonlyArray<ThreadSummary> {
    const rows = this.sql
      .exec<Row>(
        `SELECT id, title, created_at, updated_at, last_message_at
         FROM threads
         ORDER BY COALESCE(last_message_at, created_at) DESC, created_at DESC`,
      )
      .toArray()

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastMessageAt: row.last_message_at,
    }))
  }

  create(title?: string): ThreadSummary {
    const id = crypto.randomUUID()
    const now = Date.now()
    const name = title?.trim() || DEFAULT_TITLE

    this.sql.exec(
      `INSERT INTO threads (id, title, created_at, updated_at, last_message_at)
       VALUES (?, ?, ?, ?, NULL)`,
      id,
      name,
      now,
      now,
    )

    return { id, title: name, createdAt: now, updatedAt: now, lastMessageAt: null }
  }

  rename(id: string, title: string): void {
    const name = title.trim()
    if (name === '') return
    this.sql.exec(
      'UPDATE threads SET title = ?, updated_at = ? WHERE id = ?',
      name.slice(0, 80),
      Date.now(),
      id,
    )
  }

  delete(id: string): void {
    this.sql.exec('DELETE FROM threads WHERE id = ?', id)
  }

  /** Record a turn, and give the thread its first real title. */
  touch(id: string, title?: string): void {
    const row = this.sql.exec('SELECT title FROM threads WHERE id = ?', id).toArray()[0] as
      | { title: string }
      | undefined
    if (!row) return

    const next =
      row.title === DEFAULT_TITLE && title !== undefined && title.trim() !== ''
        ? title.trim().slice(0, 80)
        : row.title
    const now = Date.now()

    this.sql.exec(
      'UPDATE threads SET title = ?, updated_at = ?, last_message_at = ? WHERE id = ?',
      next,
      now,
      now,
      id,
    )
  }
}
