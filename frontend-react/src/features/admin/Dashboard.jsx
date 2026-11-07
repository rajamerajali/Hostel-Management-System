import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { staggerContainer, staggerItem } from '../../utils/motion'
import Icon from '../../components/ui/Icon'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Chip from '../../components/ui/Chip'
import AnimatedNumber from '../../components/ui/AnimatedNumber'
import { EmptyRow } from '../../components/ui/EmptyState'
import OccupancyChart from '../../components/charts/OccupancyChart'
import FeeTrendChart from '../../components/charts/FeeTrendChart'
import ComplaintDoughnutChart from '../../components/charts/ComplaintDoughnutChart'
import AttendanceChart from '../../components/charts/AttendanceChart'
import { AVATAR_COLORS, GRAD } from '../../utils/colors'
import { formatDate, timeAgo } from '../../utils/format'

// icon/label/color only — the loading state below renders these instantly
// with a shimmer standing in for the value, so real numbers never briefly
// get swapped in over a placeholder set.
const STAT_META = [
  { icon: 'users', label: 'Total Students', color: '#60a5fa' },
  { icon: 'bed', label: 'Occupied Rooms', color: '#22d3ee' },
  { icon: 'check', label: 'Available Rooms', color: '#4ade80' },
  { icon: 'alert', label: 'Open Complaints', color: '#fbbf24' },
  { icon: 'dollar', label: 'Fees Collected', color: '#a78bfa' },
  { icon: 'eye', label: 'Visitors Inside', color: '#f472b6' },
]

const ACTIVITY_DOT = { room: '#63b3ed', complaint: '#f6c35a', fee: '#68d391', visitor: '#b794f4', announcement: '#4fd1c5' }

export default function Dashboard() {
  // One request for the entire dashboard. This used to be six (stats,
  // complaints, activity, rooms, fee analytics, attendance) fired in
  // parallel, three of which downloaded whole collections just to derive a
  // few numbers in the browser — all of that is aggregated server-side now.
  // No error branch needed: every consumer below falls back on undefined
  // (charts render null, stat cards render a shimmer via STAT_META).
  const { data: summary, isLoading } = useQuery({
    queryKey: ['/dashboard-summary'],
    queryFn: () => api('/dashboard-summary').then((r) => r.data),
  })

  const complaints = summary?.recentComplaints
  const activity = summary?.activity
  const s = summary?.stats
  // Real numbers only. While `s` is still undefined (first load, or a
  // refetch that hasn't resolved yet) each card falls through to STAT_META
  // and renders a shimmer instead of a value — this used to fall back to a
  // hardcoded fixture object here, so every visit briefly flashed made-up
  // numbers before the real ones arrived.
  const STATS = s ? [
    { ...STAT_META[0], value: s.students, sub: 'Active residents' },
    { ...STAT_META[1], value: s.occupiedRooms, sub: `of ${s.occupiedRooms + s.availableRooms} rooms` },
    { ...STAT_META[2], value: s.availableRooms, sub: 'Ready to allocate' },
    { ...STAT_META[3], value: s.complaints.pending + s.complaints.inProgress, sub: `${s.complaints.escalated} escalated` },
    { ...STAT_META[4], value: 'Rs ' + Math.round(s.feesCollected / 100000) + 'L', sub: 'This semester' },
    { ...STAT_META[5], value: s.visitorsInside, sub: 'Currently in' },
  ] : STAT_META

  return (
    <>
      <motion.div className="stats-grid" variants={staggerContainer} initial="hidden" animate="visible">
        {STATS.map((st) => (
          <motion.div
            key={st.label}
            className="stat-card"
            variants={staggerItem}
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            style={{
              border: `1px solid ${st.color}33`, position: 'relative', overflow: 'hidden',
              background: `linear-gradient(135deg, ${st.color}2e, ${GRAD[st.color] || st.color}1a 45%, var(--card) 80%)`,
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${st.color}, ${GRAD[st.color] || st.color})` }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{st.label}</div>
                <div className="stat-value">
                  {!('value' in st) ? <div className="skeleton" style={{ width: 64, height: 24 }} />
                    : typeof st.value === 'number' ? <AnimatedNumber value={st.value} />
                    : st.value}
                </div>
                <div className="stat-sub">
                  {st.sub || <div className="skeleton" style={{ width: 90, height: 11, marginTop: 6 }} />}
                </div>
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
            <div className="card-header">
              <div><div className="card-title">Room Occupancy</div><div className="card-sub">Current, by block</div></div>
              <span className="badge" style={{ background: '#68d39122', color: '#68d391' }}>Live</span>
            </div>
            <div style={{ height: 200, position: 'relative' }}><OccupancyChart byBlock={summary?.occupancyByBlock} /></div>
          </div>
        </motion.div>
        <motion.div className="card accent-top-green" variants={staggerItem}>
          <div className="card-pad">
            <div className="card-header">
              <div><div className="card-title">Fee Collection (Rs Lakhs)</div><div className="card-sub">Last 6 months</div></div>
            </div>
            <div style={{ height: 200, position: 'relative' }}><FeeTrendChart months={summary?.feeMonthly} /></div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div className="grid-3" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="card accent-top-amber" variants={staggerItem}>
          <div className="card-pad">
            <div className="card-header"><div className="card-title">Complaints Status</div></div>
            <ComplaintDoughnutChart counts={summary?.complaintCounts} />
          </div>
        </motion.div>
        <motion.div className="card accent-top-cyan" variants={staggerItem}>
          <div className="card-pad">
            <div className="card-header"><div className="card-title">Weekly Attendance</div><div className="card-sub">This week</div></div>
            <div style={{ height: 180, position: 'relative' }}><AttendanceChart weekly={summary?.attendanceWeekly} /></div>
          </div>
        </motion.div>
        <motion.div className="card accent-top-purple" variants={staggerItem}>
          <div className="card-pad">
            <div className="card-header"><div className="card-title">Recent Activity</div><span className="badge" style={{ background: '#68d39122', color: '#68d391' }}>Live</span></div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {isLoading && <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>Loading...</div>}
              {!isLoading && !activity?.length && <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>No activity yet</div>}
              {activity?.map((a, i) => (
                <div key={a._id} style={{ display: 'flex', gap: 10, paddingBottom: 12, marginBottom: 12, borderBottom: i < activity.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACTIVITY_DOT[a.type] || '#94a3b8', marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>{a.text}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>by {a.by?.name || 'Unknown'} · {timeAgo(a.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-pad" style={{ borderBottom: '1px solid var(--divider)' }}>
          <div className="card-header" style={{ marginBottom: 0 }}>
            <div className="card-title">Recent Complaints</div>
            <Link to="/complaints" className="btn btn-sm btn-outline-blue">View All</Link>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Student</th><th>Room</th><th>Issue</th><th>Category</th><th>Priority</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {isLoading && <EmptyRow colSpan={8} message="Loading..." />}
              {!isLoading && !complaints?.length && <EmptyRow colSpan={8} message="No complaints found" />}
              {complaints?.slice(0, 6).map((c, i) => {
                const av = c.student?.name ? c.student.name.split(' ').map((w) => w[0]).join('').toUpperCase() : 'S'
                const color = AVATAR_COLORS[i % AVATAR_COLORS.length]
                return (
                  <tr key={c._id}>
                    <td style={{ color: 'var(--blue)', fontWeight: 700 }}>{c._id?.slice(-5).toUpperCase() || i + 1}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar initials={av} color={color} size={26} /><span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.student?.name || 'Unknown'}</span></div></td>
                    <td style={{ color: 'var(--text-sec)' }}>{c.room || '—'}</td>
                    <td style={{ color: 'var(--text)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                    <td><Chip label={c.category} /></td>
                    <td><Badge label={c.priority} /></td>
                    <td><Badge label={c.status} /></td>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(c.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
