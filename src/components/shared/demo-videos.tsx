export function youtubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/live\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m?.[1]) return m[1];
  }
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

export function DemoVideos({ urls }: { urls: string[] }) {
  const ids = urls.map(youtubeId).filter((id): id is string => !!id);
  if (ids.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Demo classes</h2>
      <p className="mt-1 text-sm text-muted-foreground">Watch a sample lesson before you book.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {ids.map((id) => (
          <div key={id} className="aspect-video overflow-hidden rounded-lg border border-border bg-muted">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${id}`}
              title="Tutor demo class"
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ))}
      </div>
    </div>
  );
}
