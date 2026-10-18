import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

/**
 * The social card, generated from code rather than shipped as a raster.
 *
 * It used to be a committed PNG, which went stale the moment the visual world
 * changed: every share showed the discarded green design while the site itself
 * had moved on, and nothing in the build could notice. Generating it here means
 * the card is rebuilt from the same tokens as the page, so it cannot drift
 * again without someone editing this file on purpose.
 *
 * No figures appear on it. The counts on the landing page come from a live
 * query, and a number baked into a cached image is a claim that goes wrong
 * quietly — the one failure mode a social card is worst placed to recover from.
 */

export const alt = "debtradar — the TODO that is about to hurt, ranked first"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OpengraphImage() {
  /*
   * Satori has no access to the fonts next/font installs, so the face is read
   * off disk.
   *
   * These are static cuts on purpose. The variable Archivo file — the same one
   * the page loads for its width axis — makes Satori's parser throw a bare
   * "Cannot read properties of undefined (reading '256')" during prerender,
   * which fails the whole build with nothing pointing at the font. So the card
   * carries two fixed weights and leans on scale rather than the narrow width
   * the headline uses on the page itself.
   */
  const [regular, bold] = await Promise.all([
    readFile(join(process.cwd(), "assets", "Archivo-Regular.ttf")),
    readFile(join(process.cwd(), "assets", "Archivo-Bold.ttf")),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0d1a",
          padding: "72px 80px",
          fontFamily: "Archivo",
          position: "relative",
        }}
      >
        {/* The field, as far as Satori can carry it: the same ramp gathering
            to the lower right, cold where the words are. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            background:
              "radial-gradient(700px 520px at 88% 86%, rgba(255,106,61,.55), transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            background:
              "radial-gradient(760px 560px at 70% 60%, rgba(180,75,232,.45), transparent 72%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            background:
              "radial-gradient(820px 620px at 52% 36%, rgba(106,108,246,.38), transparent 74%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            background:
              "linear-gradient(100deg, #0b0d1a 22%, rgba(11,13,26,.80) 48%, rgba(11,13,26,.10) 82%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 999,
              border: "3px solid #6a6cf6",
              display: "flex",
            }}
          />
          <div style={{ fontSize: 30, fontWeight: 700, color: "#dce6ff", letterSpacing: -0.5 }}>
            debtradar
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.0,
              letterSpacing: -3.5,
              color: "#dce6ff",
            }}
          >
            Hundreds of notes.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.0,
              letterSpacing: -3.5,
              color: "#dce6ff",
              marginTop: 6,
            }}
          >
            <span style={{ color: "#ff6a3d" }}>One</span>
            <span>&nbsp;is about to hurt.</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 25,
            color: "#9fb0dd",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          Ranked by age, churn and whether its author is still here
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: regular, style: "normal", weight: 400 },
        { name: "Archivo", data: bold, style: "normal", weight: 700 },
      ],
    },
  )
}
