import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import { EmptyCard } from '../../components/ui/EmptyState'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { formatDate, initials } from '../../utils/format'
import { fadeUp, staggerContainer, staggerItem, listContainer, listRow } from '../../utils/motion'

export default function StudentDashboard() {
  const { user } = useAuth()
  const p = {
    name: user?.name || 'Arjun Mehta', rollNo: user?.rollNo || '22CS001', room: user?.room || 'A-101',
    block: user?.block || 'A', branch: user?.branch || 'Computer Science', year: user?.year || 2,
    feeStatus: user?.feeStatus || 'paid',
  }
  const feeColor = p.feeStatus === 'paid' ? '#68d391' : p.feeStatus === 'partial' ? '#f6c35a' : '#fc8181'

  // One request for the whole page, replacing the three (/complaints,
  // /announcements, /attendance) it used to fire — the latter two were each
  // downloading a whole collection just to show 3 rows or derive one
  // percentage, which the endpoint now computes server-side.
  const { data, isLoading, error } = useQuery({
    queryKey: ['/student-summary'],
    queryFn: () => api('/student-summary').then((r) => r.data),
  })

  const complaints = data?.complaints || []
  const announcements = data?.announcements || []
  const attendancePct = data?.attendancePct ?? null
  const attColor = attendancePct === null || attendancePct >= 75 ? '#4fd1c5' : '#f6c35a'

  return (
    <>
      <motion.div className="card" variants={fadeUp} initial="hidden" animate="visible" style={{ marginBottom: 16 }}>
        <div className="card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Avatar initials={initials(p.name)} color="#f687b3" size={56} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{p.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 2 }}>{p.rollNo} · {p.branch} · Year {p.year}</div>
          </div>
          <Badge label={p.feeStatus} color={feeColor} />
          <Badge label={attendancePct === null ? 'No attendance yet' : `${attendancePct}% attendance`} color={attColor} />
        </div>
      </motion.div>

      <motion.div className="grid-2" style={{ marginBottom: 16 }} variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="card accent-top-blue" variants={staggerItem}>
          <div className="card-pad">
            <div className="card-header"><div className="card-title">My Room</div></div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{p.room}</div>
            <div style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 4 }}>Block {p.block}</div>
          </div>
        </motion.div>
        <motion.div className="card accent-top-green" variants={staggerItem}>
          <div className="card-pad">
            <div className="card-header"><div className="card-title">Fee Status</div></div>
            <div style={{ fontSize: 22, fontWeight: 800, color: feeColor, textTransform: 'capitalize' }}>{p.feeStatus}</div>
            <div style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 4 }}>This semester</div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div className="grid-2" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="card" variants={staggerItem}>
          <div className="card-pad" style={{ borderBottom: '1px solid var(--divider)' }}><div className="card-title">My Complaints</div></div>
          <motion.div style={{ padding: '8px 20px 16px' }} variants={listContainer} initial="hidden" animate="visible">
            {isLoading && <EmptyCard message="Loading..." />}
            {!isLoading && error && <EmptyCard message="Could not load complaints" tone="error" />}
            {!isLoading && !error && complaints.length === 0 && <EmptyCard message="No complaints filed yet" />}
            {!isLoading && !error && complaints.map((c) => (
              <motion.div key={c._id} variants={listRow} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(c.createdAt)}</div>
                </div>
                <Badge label={c.status} />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
        <motion.div className="card" variants={staggerItem}>
          <div className="card-pad" style={{ borderBottom: '1px solid var(--divider)' }}><div className="card-title">Latest Announcements</div></div>
          <motion.div style={{ padding: '8px 20px 16px' }} variants={listContainer} initial="hidden" animate="visible">
            {isLoading && <EmptyCard message="Loading..." />}
            {!isLoading && error && <EmptyCard message="Could not load announcements" tone="error" />}
            {!isLoading && !error && announcements.length === 0 && <EmptyCard message="No announcements yet" />}
            {!isLoading && !error && announcements.map((a) => (
              <motion.div key={a._id} variants={listRow} style={{ padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{formatDate(a.createdAt)}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  )
}
