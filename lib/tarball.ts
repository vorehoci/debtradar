import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { createGunzip } from "node:zlib"
import type { Octokit } from "octokit"
import { extract } from "tar-stream"
import { commentSyntaxFor, type CommentSyntax } from "./comments"

/** Files larger than this are minified bundles or data, not code worth reading. */
const MAX_FILE_BYTES = 400_000

export interface ScannedFile {
  path: string
  source: string
  syntax: CommentSyntax
}

/**
 * Streams a repository's tarball, yielding every file worth scanning.
 *
 * The obvious alternative — list the tree, then fetch each blob — costs one API
 * request per file. A repository of 8,000 files would exhaust an installation's
 * hourly rate limit before finishing, so any per-file cap silently truncates
 * large repositories rather than scanning them. One tarball is one request.
 */
export async function eachSourceFile(
  octokit: Octokit,
  params: { owner: string; repo: string; ref: string },
  onFile: (file: ScannedFile) => void,
): Promise<{ scanned: number; skipped: number }> {
  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/tarball/{ref}",
    { ...params, request: { parseSuccessResponseBody: false } },
  )

  const archive = extract()
  let scanned = 0
  let skipped = 0

  archive.on("entry", (header, stream, next) => {
    // Entries are prefixed with a generated root like `TryGhost-Ghost-a1b2c3/`.
    const path = header.name.split("/").slice(1).join("/")
    const syntax = path ? commentSyntaxFor(path) : undefined

    if (header.type !== "file" || !syntax || (header.size ?? 0) > MAX_FILE_BYTES) {
      skipped++
      stream.resume() // Draining is required, or the archive stalls.
      stream.on("end", next)
      return
    }

    const chunks: Buffer[] = []
    stream.on("data", (chunk: Buffer) => chunks.push(chunk))
    stream.on("end", () => {
      scanned++
      onFile({ path, source: Buffer.concat(chunks).toString("utf8"), syntax })
      next()
    })
    stream.on("error", next)
  })

  const body = response.data as unknown as NodeJS.ReadableStream
  await pipeline(Readable.from(body), createGunzip(), archive)

  return { scanned, skipped }
}
