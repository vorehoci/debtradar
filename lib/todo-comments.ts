/**
 * Notes people leave on a TODO — distinct from `lib/comments.ts`, which is
 * about comment *syntax* in source files.
 *
 * These live outside `db/` so client components can import them: anything
 * reached from a `"use client"` module is bundled for the browser, and
 * `db/repository.ts` pulls in the database connection. That failure appears at
 * runtime, not compile time, so the type checker gives no warning.
 */

export interface TodoCommentRow {
  id: string
  todoId: string
  body: string
  authorLogin: string
  createdAt: Date
}

/** Longer than any useful note, short enough that the column cannot be abused. */
export const MAX_COMMENT_LENGTH = 2_000
