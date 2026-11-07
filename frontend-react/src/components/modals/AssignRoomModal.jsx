import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import RoomTile from '../ui/RoomTile'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'

// Matches Room.block's real schema enum (backend/models/Room.js).
const BLOCK_OPTIONS = ['A', 'B', 'C', 'D']

export default function AssignRoomModal({ open, student, onClose, onAssigned }) {
  const toast = useToast()
  const [rooms, setRooms] = useState([])
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [block, setBlock] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('available')

  useEffect(() => {
    if (!open) return
    setBlock(''); setType(''); setStatus('available'); setFailed(false)
    setLoading(true)
    api('/rooms')
      .then((r) => setRooms(r.data || []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = rooms.filter((r) =>
    (!block || r.block === block) && (!type || r.type === type) && (!status || r.status === status)
  )

  const handleSelect = async ({ room, isAvail, isMaint }) => {
    if (!isAvail) {
      toast(isMaint ? `⚠ Room ${room.number} is under maintenance!` : `⚠ Room ${room.number} is full!`, isMaint ? 'warning' : 'error')
      return
    }
    if (!confirm(`Assign room ${room.number} to this student?`)) return
    try {
      await api(`/rooms/${room._id}/allocate`, { method: 'POST', body: { studentId: student.id } })
      toast(`✓ Room ${room.number} assigned successfully!`, 'success')
      onClose()
      onAssigned()
    } catch (err) {
      const msg = (err.message || '').toLowerCase()
      if (msg.includes('maintenance')) toast('⚠ Room is under maintenance!', 'warning')
      else if (msg.includes('full')) toast('⚠ Room is full!', 'error')
      else toast(err.message || 'Assignment failed.', 'error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Assign Room" subtitle={`Student: ${student?.name || ''}`} maxWidth={620}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <select className="form-select" style={{ width: 'auto', flex: 1 }} value={block} onChange={(e) => setBlock(e.target.value)}>
          <option value="">All Blocks</option>
          {BLOCK_OPTIONS.map((b) => <option key={b} value={b}>Block {b}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto', flex: 1 }} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All Types</option><option value="Single">Single</option><option value="Double">Double</option><option value="Triple">Triple</option>
        </select>
        <select className="form-select" style={{ width: 'auto', flex: 1 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="available">Available Only</option><option value="">All Status</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: 8, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
        {loading && <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', gridColumn: '1/-1' }}>Loading rooms...</div>}
        {!loading && failed && <div style={{ textAlign: 'center', padding: 20, color: 'var(--red)', gridColumn: '1/-1' }}>Could not load rooms. Is server running?</div>}
        {!loading && !failed && filtered.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', gridColumn: '1/-1' }}>No rooms match your filter</div>}
        {!loading && !failed && filtered.map((r) => <RoomTile key={r._id} room={r} mode="assign" onSelect={handleSelect} />)}
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
        <span>🟢 Available — click to assign</span>
        <span>🔵 Occupied — full</span>
        <span>🟡 Maintenance</span>
      </div>
    </Modal>
  )
}
