import { useState } from 'react'
import Modal from '../ui/Modal'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'

const ALL_BLOCKS = ['A', 'B', 'C', 'D']
const TYPE_CYCLE = ['Single', 'Double', 'Triple']
const CAPACITY = { Single: 1, Double: 2, Triple: 3 }
const RENT = { Single: 8500, Double: 7000, Triple: 5500 }

// Builds real Room documents (floor-based numbering, e.g. A-101, A-102,
// A-201...) — sent to POST /rooms/bulk, not a hardcoded fixture.
function buildRooms(blocks, floors, perFloor) {
  const rooms = []
  for (const block of blocks) {
    for (let floor = 1; floor <= floors; floor++) {
      for (let i = 1; i <= perFloor; i++) {
        const type = TYPE_CYCLE[rooms.length % 3]
        rooms.push({
          number: `${block}-${floor}${String(i).padStart(2, '0')}`,
          block, floor, type,
          capacity: CAPACITY[type],
          rent: RENT[type],
        })
      }
    }
  }
  return rooms
}

export default function GenerateRoomsModal({ open, onClose, onCreated }) {
  const toast = useToast()
  const [blocks, setBlocks] = useState(ALL_BLOCKS)
  const [floors, setFloors] = useState('4')
  const [perFloor, setPerFloor] = useState('3')
  const [submitting, setSubmitting] = useState(false)

  const toggleBlock = (b) => setBlocks((cur) => (cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b]))

  const total = blocks.length * (Number(floors) || 0) * (Number(perFloor) || 0)

  const submit = async () => {
    if (blocks.length === 0) { toast('Select at least one block.', 'warning'); return }
    if (!floors || !perFloor || total === 0) { toast('Enter floors and rooms per floor.', 'warning'); return }
    if (total > 200) { toast('That’s a lot of rooms — try 200 or fewer at a time.', 'warning'); return }

    const rooms = buildRooms(blocks, Number(floors), Number(perFloor))
    setSubmitting(true)
    try {
      const res = await api('/rooms/bulk', { method: 'POST', body: { rooms } })
      toast(res.message || `${res.count} rooms created!`, 'success')
      onClose()
      onCreated()
    } catch (err) {
      toast(err.message || 'Failed to generate rooms.', 'error')
    }
    setSubmitting(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="🎲 Generate Rooms">
      <div className="form-group">
        <label className="form-label">Blocks</label>
        <div style={{ display: 'flex', gap: 10 }}>
          {ALL_BLOCKS.map((b) => (
            <label key={b} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
              <input type="checkbox" checked={blocks.includes(b)} onChange={() => toggleBlock(b)} style={{ width: 15, height: 15, cursor: 'pointer' }} />
              Block {b}
            </label>
          ))}
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: 0 }}>
        <div className="form-group">
          <label className="form-label">Floors per block</label>
          <input className="form-input" type="number" min="1" max="20" value={floors} onChange={(e) => setFloors(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Rooms per floor</label>
          <input className="form-input" type="number" min="1" max="20" value={perFloor} onChange={(e) => setPerFloor(e.target.value)} />
        </div>
      </div>
      <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--hover)', border: '1px solid var(--divider)', fontSize: 12, color: 'var(--text-sec)', marginBottom: 14 }}>
        Will create <strong style={{ color: 'var(--text)' }}>{total}</strong> room{total === 1 ? '' : 's'} — types (Single/Double/Triple) cycle evenly, all start as "available".
      </div>
      <button className="btn btn-primary btn-full" onClick={submit} disabled={submitting}>
        {submitting ? 'Generating...' : `Generate ${total || ''} Rooms`}
      </button>
    </Modal>
  )
}
