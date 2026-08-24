/**
 * The list skeleton one level up would otherwise be used here, flashing rows
 * where columns are about to appear.
 */
export default function Loading() {
  return (
    <main className="w-full animate-pulse px-6 py-10">
      <div className="mb-8">
        <div className="h-7 w-64 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-2 h-4 w-48 rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <div className="flex gap-4 overflow-hidden">
        {[0, 1, 2].map((column) => (
          <div key={column} className="flex min-w-72 flex-1 flex-col">
            <div className="mb-3 h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="h-24 rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
