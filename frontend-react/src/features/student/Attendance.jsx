import { useMemo } from 'react'
import { motion } from 'framer-motion'
import SectionHeader from '../../components/ui/SectionHeader'
import Badge from '../../components/ui/Badge'
import { EmptyCard } from '../../components/ui/EmptyState'
import StudentAttendanceChart from '../../components/charts/StudentAttendanceChart'
import { useApiData } from '../../hooks/useApiData'
import { formatDate } from '../../utils/format'
import { staggerContainer, staggerItem, listContainer, listRow } from '../../utils/motion'

export default function StudentAttendance() {
  const { data: records, loading, error } = useApiData('/attendance')

  const stats = useMemo(() => {
    const total = records.length
    const present = records.filter((r) => r.status === 'present').length
    const absent = records.filter((r) => r.status === 'absent').length
    const leave = records.filter((r) => r.status === 'leave').length
    const pct = total > 0 ? Math.round((present / total) * 100) : 0
    return { total, present, absent, leave, pct }
  }, [records])

  const sorted = useMemo(() => [...records].sort((a, b) => b.date.localeCompare(a.date)), [records])

  return (
    <>
      <SectionHeader title="My Attendance" />

      <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 20 }} variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="card" variants={staggerItem} style={{ padding: 18, borderTop: '2px solid #63b3ed' }}><div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>Total Days</div><div style={{ fontSize: 22, fontWeight: 800, color: '#63b3ed' }}>{stats.total}</div></motion.div>
        <motion.div className="card" variants={staggerItem} style={{ padding: 18, borderTop: '2px solid #68d391' }}><div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>Present</div><div style={{ fontSize: 22, fontWeight: 800, color: '#68d391' }}>{stats.present}</div></motion.div>
        <motion.div className="card" variants={staggerItem} style={{ padding: 18, borderTop: '2px solid #fc8181' }}><div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>Absent</div><div style={{ fontSize: 22, fontWeight: 800, color: '#fc8181' }}>{stats.absent}</div></motion.div>
        <motion.div className="card" variants={staggerItem} style={{ padding: 18, borderTop: '2px solid #f6c35a' }}><div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>Leave</div><div style={{ fontSize: 22, fontWeight: 800, color: '#f6c35a' }}>{stats.leave}</div></motion.div>
        <motion.div className="card" variants={staggerItem} style={{ padding: 18, borderTop: '2px solid #4fd1c5' }}><div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>Percentage</div><div style={{ fontSize: 22, fontWeight: 800, color: '#4fd1c5' }}>{stats.pct}%</div></motion.div>
      </motion.div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad">
          <div className="card-header"><div className="card-title">Last 7 Days</div></div>
          <div style={{ height: 220, position: 'relative' }}><StudentAttendanceChart records={records} /></div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, justifyContent: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-sec)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#68d391', display: 'inline-block' }} />Present</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-sec)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fc8181', display: 'inline-block' }} />Absent</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-sec)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f6c35a', display: 'inline-block' }} />Leave</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--divider)' }}><div className="card-title">Recent Attendance Log</div></div>
        <div style={{ padding: '8px 20px 16px' }}>
          {loading && <EmptyCard message="Loading..." />}
          {!loading && error && <EmptyCard message="Could not load attendance" tone="error" />}
          {!loading && !error && sorted.length === 0 && <EmptyCard message="No attendance records yet" />}
          <motion.div variants={listContainer} initial="hidden" animate="visible">
            {!loading && !error && sorted.slice(0, 10).map((r, i) => (
              <motion.div key={r._id} variants={listRow} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < Math.min(sorted.length, 10) - 1 ? '1px solid var(--divider)' : 'none' }}>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{formatDate(r.date)}</span>
                <Badge label={r.status} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </>
  )
}
