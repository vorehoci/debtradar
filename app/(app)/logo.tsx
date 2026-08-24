/**
 * The debtradar wordmark.
 *
 * The supplied brand green (#6dffc6) measures 15.8:1 on the dark surface and
 * 1.25:1 on white — it is a dark-mode mark, and on the light theme it would be
 * invisible rather than merely low-contrast. So the wordmark is drawn with
 * `currentColor` and the caller sets the step: the brand green in dark, a
 * darker same-hue green (#07845d, 4.7:1) in light.
 *
 * The radar blip stays its own red in both modes — it is a raster image inside
 * the artwork and carries the accent regardless of surface.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 212 35"
      className={className}
      role="img"
      aria-label="debtradar"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <image
          id="debtradar-blip"
          width="10"
          height="11"
          href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAALCAMAAABxsOwqAAAAAXNSR0IB2cksfwAAAFFQTFRFAAAA/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1N/x1NhO69GQAAABt0Uk5TADpfhApPyPv9vf+h+rTWr5v4LLMJRLvu9U5xIzndAAAAAE1JREFUeJxFzEkKgDAUBNEuTYggDgTvf0S3Ghy+mgSs1Vs0jQTIzISj0qBDX7bTc2c2xnCp1DKelY7pqPTMpKxgRLYy9Sz/rxTDy7TqAcHfGHx35Eh9AAAAAElFTkSuQmCC"
        />
      </defs>

      <use href="#debtradar-blip" x="201" y="22" />

      <path
        fill="currentColor"
        d="m4 32v-28.4h17v2.8h2.9v22.8h-2.9v2.8zm11.4-5.7v-2.8h2.8v-11.4h-2.8v-2.8h-5.7v17zm11.7 2.9v-17.1h2.8v-2.8h14.2v2.8h2.8v11.4h-14.2v2.8h14.2v2.9h-2.8v2.8h-14.2v-2.8zm5.7-14.2v2.8h8.5v-2.8zm22 0v11.3h8.5v-11.3zm0-11.4v8.5h2.8v-2.8h8.6v2.8h2.8v17.1h-2.8v2.8h-17.1v-28.4zm17.4 14.2v-5.7h2.8v-5.7h2.8v-2.8h2.9v8.5h5.6v5.7h-5.6v8.5h5.6v5.7h-8.5v-2.8h-2.8v-11.4zm17 14.2v-28.4h17v2.8h2.9v11.4h-2.9v2.8h2.9v11.4h-5.7v-8.5h-8.5v8.5zm5.6-14.2h8.6v-8.5h-8.6zm20.2 14.2v-2.9h-2.8v-8.5h2.8v-2.8h11.4v-2.9h-14.2v-2.8h2.8v-2.8h14.2v2.8h2.8v19.9h-5.6v-2.9h-2.9v2.9zm2.9-8.5v2.8h8.5v-2.8zm20.1-14.2h11.4v-5.7h5.7v28.4h-5.7v-2.9h-2.8v2.9h-8.6v-2.9h-2.8v-17h2.8zm2.9 17h8.5v-11.3h-8.5zm19.1 5.7v-2.9h-2.8v-8.5h2.8v-2.8h11.4v-2.9h-14.2v-2.8h2.8v-2.9h14.2v2.9h2.9v19.9h-5.7v-2.9h-2.8v2.9zm2.8-8.6v2.9h8.5v-2.9zm28.7-5.6v-2.9h-2.8v2.9h-2.9v14.2h-5.7v-22.8l5.7 0.1v2.8h2.9v-2.8h5.6v2.8h2.9v2.8h-2.9z"
      />
    </svg>
  )
}
