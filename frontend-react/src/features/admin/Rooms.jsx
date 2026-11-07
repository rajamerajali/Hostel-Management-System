import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import SectionHeader from '../../components/ui/SectionHeader'
import RoomTile from '../../components/ui/RoomTile'
import RoomModal from '../../components/modals/RoomModal'
import GenerateRoomsModal from '../../components/modals/GenerateRoomsModal'
import { EmptyCard } from '../../components/ui/EmptyState'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { listContainer, listRow } from '../../utils/motion'

const BLOCKS = ['A', 'B', 'C', 'D']
// Same fallback fixture as the old admin.html, used only if GET /api/rooms fails.
const ROOMS_DATA = Array.from({ length: 48 }, (_, i) => ({
  number: `${BLOCKS[Math.floor(i / 12)]}-${101 + (i % 12)}`,
  type: ['Single', 'Double', 'Triple'][i % 3],
  status: i % 11 === 10 ? 'maintenance' : i % 7 === 0 ? 'available' : 'occupied',
}))

export default function Rooms() {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [genModalOpen, setGenModalOpen] = useState(false)

  // Query key ('/rooms') matches OccupancyChart and warden Dashboard's own
  // '/rooms' fetch — all three share one cached result.
  const { data: rooms, isLoading: loading, refetch: load } = useQuery({
    queryKey: ['/rooms'],
    queryFn: () => api('/rooms').then((r) => r.data || []).catch(() => ROOMS_DATA),
  })

  const deleteRoom = async (room) => {
    if (!confirm(`Delete room ${room.number}? This cannot be undone.`)) return
    try {
      await api(`/rooms/${room._id}`, { method: 'DELETE' })
      toast(`Room ${room.number} deleted.`, 'error')
      load()
    } catch (err) {
      toast(err.message || 'Delete failed.', 'error')
    }
  }

  return (
    <>
      <SectionHeader
        title="Room Management"
        actions={(
          <>
            <button className="btn btn-outline-purple" onClick={() => setGenModalOpen(true)}>🎲 Generate Rooms</button>
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Add Room</button>
          </>
        )}
      />
      <div className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--divider)' }}>
          <div className="card-header" style={{ marginBottom: 0 }}>
            <div className="card-title">Room Status Grid</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-sec)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#63b3ed', display: 'inline-block' }} />Occupied</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-sec)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#68d391', display: 'inline-block' }} />Available</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-sec)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f6c35a', display: 'inline-block' }} />Maintenance</span>
            </div>
          </div>
        </div>
        <motion.div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(76px,1fr))', gap: 8 }} variants={listContainer} initial="hidden" animate="visible">
          {loading && <EmptyCard message="Loading rooms..." />}
          {!loading && rooms?.length === 0 && <EmptyCard message="No rooms found in database" />}
          {!loading && rooms?.map((r) => (
            <motion.div key={r._id || r.number} variants={listRow}>
              <RoomTile room={r} mode="manage" onDelete={deleteRoom} />
            </motion.div>
          ))}
        </motion.div>
      </div>

      <RoomModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={load} />
      <GenerateRoomsModal open={genModalOpen} onClose={() => setGenModalOpen(false)} onCreated={load} />
    </>
  )
}
