/** Shown while a trips page fetches its data; neutral blocks that match the page rhythm. */
export default function Loading() {
  return (
    <div aria-hidden className="mx-auto flex max-w-content animate-pulse flex-col gap-6 px-[clamp(16px,4vw,40px)] pt-12">
      <div className="h-10 w-64 rounded-md bg-sunken" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(360px,100%),1fr))] gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[300px] rounded-lg bg-sunken" />
        ))}
      </div>
    </div>
  );
}
