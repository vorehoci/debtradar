/**
 * Rows per column page.
 *
 * Its own module because a `"use server"` file may only export async functions —
 * a constant exported from `actions.ts` is a build error — and the board, the
 * page and the action all have to agree on this number or "Load more" would
 * either skip rows or repeat them.
 */
export const PAGE_SIZE = 20
