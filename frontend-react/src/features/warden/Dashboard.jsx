import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import Icon from '../../components/ui/Icon'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import AnimatedNumber from '../../components/ui/AnimatedNumber'
import RoomTile from '../../components/ui/RoomTile'
import { EmptyCard, EmptyRow } from '../../components/ui/EmptyState'
import { api } from '../../api/client'
import { AVATAR_COLORS } from '../../utils/colors'
import { formatDate } from '../../utils/format'
import { staggerContainer, staggerItem, listContainer, listRow } from '../../utils/motion'

const BLOCKS = ['A', 'B', 'C', 'D']

export default function WardenDashboard() {
  // One request for the whole page, replacing the three (/visitors,
  // /complaints, /rooms) it used to fire — the two list endpoints were
  // downloading entire collections to show five and four rows respectively.
  const { data, isLoading, error } = useQuery({
    queryKey: ['/warden-summary'],
    queryFn: () => api('/warden-summary').then((r) => r.data),
  })

  const roomsData = data?.rooms || []
  const visitors = data?.visitorQueue || []
  const complaints = data?.recentComplaints || []

  const stats = useMemo(() => [
    { icon: 'bed', label: 'Total Rooms', value: roomsData.length, color: '#60a5fa' },
    { icon: 'users', label: 'Residents', value: roomsData.reduce((sum, r) => sum + (r.occupied || 0), 0), color: '#4ade80' },
    // Counted server-side across all complaints/visitors, not just the few
    // rows listed below them.
    { icon: 'alert', label: 'Open Complaints', value: data?.openComplaints || 0, color: '#fbbf24' },
    { icon: 'eye', label: 'Pending Visitors', value: data?.pendingVisitors || 0, color: '#f472b6' },
  ], [roomsData, data])

  const occupancy = useMemo(() => BLOCKS.map((b) => {
    const blockRooms = roomsData.filter((r) => r.block === b)
    const cap = blockRooms.reduce((s, r) => s + (r.capacity || 0), 0)
    const occ = blockRooms.reduce((s, r) => s + (r.occupied || 0), 0)
    return { block: b, pct: cap > 0 ? Math.round((occ / cap) * 100) : 0 }
  }), [roomsData])

  return (
    <>
      <motion.div className="stats-grid" variants={staggerContainer} initial="hidden" animate="visible">
        {stats.map((st) => (
          <motion.div key={st.label} className="stat-card" variants={staggerItem} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} style={{ border: `1px solid ${st.color}33` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{st.label}</div>
                <div className="stat-value"><AnimatedNumber value={st.value} /></div>
              </div>
              <div className="stat-icon" style={{ background: `${st.color}20`, border: `1px solid ${st.color}33`, '--icon-glow': st.color }}>
                <Icon name={st.icon} size={20} color={st.color} />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div className="grid-2" style={{ marginBottom: 16 }} variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="card accent-top-blue" variants={staggerItem}>
          <div className="card-pad">
            <div className="card-header"><div className="card-title">Block Occupancy</div></div>
            <motion.div variants={listContainer} initial="hidden" animate="visible">
              {occupancy.map((o) => (
                <motion.div key={o.block} variants={listRow} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-sec)', marginBottom: 4 }}>
                    <span>{o.block}</span><span>{o.pct}%</span>
                  </div>
                  <div className="progress"><div className="progress-bar" style={{ width: `${o.pct}%`, background: 'var(--accent)' }} /></div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
        <motion.div className="card accent-top-cyan" variants={staggerItem}>
          <div className="card-pad">
            <div className="card-header"><div className="card-title">Visitor Queue</div><span className="badge" style={{ background: '#63b3ed22', color: '#63b3ed' }}>Today</span></div>
            {isLoading && <EmptyCard message="Loading..." />}
            {!isLoading && error && <EmptyCard message="Could not load visitors" tone="error" />}
            {!isLoading && !error && visitors.length === 0 && <EmptyCard message="No visitors yet" />}
            <motion.div variants={listContainer} initial="hidden" animate="visible">
              {!isLoading && !error && visitors.map((v) => (
                <motion.div key={v._id} variants={listRow} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
                  <Avatar initials={(v.student?.name || v.name || 'V')[0]} color="#63b3ed" size={30} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{v.student?.name || v.name || 'Visitor'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.purpose} · Room {v.room || '—'}</div>
                  </div>
                  <Badge label={v.status} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      <div className="card" style={{ marginBottom: 16 }}>
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
          {isLoading && <EmptyCard message="Loading rooms..." />}
          {!isLoading && roomsData.length === 0 && <EmptyCard message="No rooms found in database" />}
          {!isLoading && roomsData.map((r) => (
            <motion.div key={r._id || r.number} variants={listRow}>
              <RoomTile room={r} mode="view" />
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--divider)' }}>
          <div className="card-header" style={{ marginBottom: 0 }}><div className="card-title">Open Complaints</div></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Room</th><th>Issue</th><th>Priority</th><th>Status</th><th>Date</th></tr></thead>
            <motion.tbody variants={listContainer} initial="hidden" animate="visible">
              {isLoading && <EmptyRow colSpan={6} message="Loading..." />}
              {!isLoading && error && <EmptyRow colSpan={6} message="Could not load complaints" tone="error" />}
              {!isLoading && !error && complaints.length === 0 && <EmptyRow colSpan={6} message="No complaints found" />}
              {!isLoading && !error && complaints.map((c, i) => (
                <motion.tr key={c._id} variants={listRow}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar initials={(c.student?.name || 'S')[0]} color={AVATAR_COLORS[i % AVATAR_COLORS.length]} size={26} /><span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.student?.name || 'Unknown'}</span></div></td>
                  <td style={{ color: 'var(--text-sec)' }}>{c.room || '—'}</td>
                  <td style={{ color: 'var(--text)' }}>{c.title}</td>
                  <td><Badge label={c.priority} /></td>
                  <td><Badge label={c.status} /></td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(c.createdAt)}</td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </div>
    </>
  )
}
