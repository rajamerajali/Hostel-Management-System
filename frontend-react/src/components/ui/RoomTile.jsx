import { ROOM_STATUS_COLORS } from '../../utils/colors'

// Shared between the read-only Rooms section grid, the clickable
// AssignRoomModal grid, and admin's "manage" grid (delete affordance) — the
// old code near-duplicated this markup in renderRoomGrid()/renderAssignGrid().
export default function RoomTile({ room, mode = 'view', onSelect, onDelete }) {
  const color = ROOM_STATUS_COLORS[room.status] || '#63b3ed'
  const capacity = room.capacity || 1
  const occupied = room.occupied || 0
  const spotsLeft = capacity - occupied
  const isAvail = room.status === 'available' && occupied < capacity
  const isMaint = room.status === 'maintenance'
  const clickable = mode === 'assign'

  const title = mode === 'assign'
    ? `${room.number} | ${room.type} | ${room.status}${isAvail ? ` | ${spotsLeft} spot(s) left` : ''}`
    : `${room.number} – ${room.type} | ${room.status} | ${spotsLeft} spot(s) left`

  return (
    <div
      title={title}
      className={`room-tile${clickable && isAvail ? ' assignable' : ''}`}
      onClick={clickable ? () => onSelect({ room, isAvail, isMaint }) : undefined}
      style={{
        padding: '10px 8px', borderRadius: 10, textAlign: 'center',
        border: `1.5px solid ${color}${mode === 'assign' ? (isAvail ? '66' : '30') : '44'}`,
        background: `${color}${mode === 'assign' ? (isAvail ? '18' : '08') : '10'}`,
        cursor: clickable ? (isAvail ? 'pointer' : 'not-allowed') : 'default',
        opacity: mode === 'assign' && !isAvail ? 0.55 : 1,
        transition: 'transform .15s, box-shadow .15s',
        position: 'relative',
      }}
    >
      {mode === 'manage' && (
        <span
          title="Delete room"
          onClick={(e) => { e.stopPropagation(); onDelete(room) }}
          style={{
            position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%',
            background: '#fc8181', color: '#fff', fontSize: 10, lineHeight: '16px', textAlign: 'center',
            cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,.3)',
          }}
        >×</span>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color }}>{room.number}</div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{(room.type || '').slice(0, 3)}</div>
      <div style={{ fontSize: 9, color, marginTop: 1, fontWeight: mode === 'assign' ? 600 : 400 }}>
        {mode === 'assign'
          ? (isAvail ? `${spotsLeft} left` : room.status)
          : (room.status === 'available' ? `${spotsLeft} left` : room.status)}
      </div>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, margin: '4px auto 0' }} />
    </div>
  )
}
