/**
 * Streamed the moment a filter or sort link is clicked, before the server has
 * finished querying. Without it a navigation shows the previous page unchanged
 * for several hundred milliseconds, which reads as an unresponsive control
 * rather than a slow one.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl animate-pulse px-6 py-16">
      <div className="mb-6">
        <div className="h-4 w-28 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-4 h-7 w-64 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-2 h-4 w-48 rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <div className="mb-6 flex items-center justify-between gap-3 border-y border-neutral-200 py-3 dark:border-neutral-800">
        <div className="flex gap-1.5">
          {[64, 52, 76, 56].map((width) => (
            <div
              key={width}
              className="h-7 rounded-full bg-neutral-200 dark:bg-neutral-800"
              style={{ width }}
            />
          ))}
        </div>
        <div className="h-7 w-36 rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <ul>
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <li key={row} className="border-b border-neutral-200 py-5 dark:border-neutral-800">
            <div className="h-4 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="mt-3 h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="mt-2 h-3 w-5/6 rounded bg-neutral-200 dark:bg-neutral-800" />
          </li>
        ))}
      </ul>
    </main>
  )
}
