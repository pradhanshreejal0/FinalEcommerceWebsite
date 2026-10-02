export default function AnalyticsBarChart({ data = [], valueKey = "sales", valueLabel = "Sales", formatValue = (value) => `RS ${Number(value || 0).toFixed(0)}` }) {
  const max = Math.max(...data.map((item) => Number(item?.[valueKey] || 0)), 1);

  if (!data.length) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        No analytics data for this period.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-background p-5 shadow-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{valueLabel} by month</h3>
          <p className="mt-1 text-xs text-muted-foreground">Hover a bar to see the exact value.</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Monthly</span>
      </div>

      <div className="relative h-72">
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-8">
          {[4, 3, 2, 1, 0].map((step) => (
            <div key={step} className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/60" />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-8 top-2 flex items-end gap-2 sm:gap-4">
          {data.map((item) => {
            const value = Number(item?.[valueKey] || 0);
            const height = Math.max((value / max) * 100, value > 0 ? 4 : 1);
            return (
              <div key={item.label} className="group flex min-w-0 flex-1 flex-col items-center justify-end self-stretch">
                <div className="relative flex h-full w-full max-w-14 items-end justify-center">
                  <div
                    className="w-full rounded-t-lg bg-primary/80 transition-all duration-300 group-hover:bg-primary group-hover:shadow-lg"
                    style={{ height: `${height}%` }}
                    title={`${item.label}: ${formatValue(value)}`}
                  >
                    <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100">
                      {formatValue(value)}
                    </div>
                  </div>
                </div>
                <span className="mt-3 max-w-full truncate text-[11px] text-muted-foreground">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
