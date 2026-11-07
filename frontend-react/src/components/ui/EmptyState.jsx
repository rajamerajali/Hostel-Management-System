// Table empty-row variant: <tr><td colSpan style="text-align:center...">message</td></tr>
export function EmptyRow({ colSpan, message, tone = 'muted' }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ textAlign: 'center', padding: 30, color: tone === 'error' ? 'var(--red)' : 'var(--text-muted)' }}>
        {message}
      </td>
    </tr>
  )
}

// Non-table empty-card variant, used by grids/lists (rooms, announcements, room-requests).
export function EmptyCard({ message, tone = 'muted' }) {
  return (
    <div style={{ textAlign: 'center', padding: 30, color: tone === 'error' ? 'var(--red)' : 'var(--text-muted)' }}>
      {message}
    </div>
  )
}
