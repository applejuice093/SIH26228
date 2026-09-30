export default function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
      <div className="card text-sm text-muted">Not implemented yet.</div>
    </div>
  )
}
