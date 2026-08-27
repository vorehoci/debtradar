/**
 * The list skeleton one level up would otherwise be used here, flashing rows
 * where columns are about to appear.
 */
export default function Loading() {
  return (
    <main className="w-full animate-pulse px-6 py-10">
      <div className="mb-8">
        <div className="h-7 w-64 rounded bg-edge" />
        <div className="mt-2 h-4 w-48 rounded bg-edge" />
      </div>

      <div className="flex gap-4 overflow-hidden">
        {[0, 1, 2].map((column) => (
          <div key={column} className="flex min-w-72 flex-1 flex-col">
            <div className="mb-3 h-4 w-24 rounded bg-edge" />
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((card) => (
                <div key={card} className="h-24 rounded-lg border border-edge bg-panel" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
