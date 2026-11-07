// Port of skeletonRows(cols, rows) — shimmering placeholder table rows shown while a fetch is in flight.
export default function SkeletonRows({ cols, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }, (_, c) => (
            <td key={c}>
              <div className="skeleton" style={{ width: `${60 + Math.floor(Math.random() * 30)}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
