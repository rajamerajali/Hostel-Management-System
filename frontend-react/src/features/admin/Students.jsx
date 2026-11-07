import { useState } from 'react'
import { motion } from 'framer-motion'
import SectionHeader from '../../components/ui/SectionHeader'
import SkeletonRows from '../../components/ui/SkeletonRows'
import { EmptyRow } from '../../components/ui/EmptyState'
import Avatar from '../../components/ui/Avatar'
import UserModal from '../../components/modals/UserModal'
import ProfileModal from '../../components/modals/ProfileModal'
import AssignRoomModal from '../../components/modals/AssignRoomModal'
import { useApiData } from '../../hooks/useApiData'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { AVATAR_COLORS } from '../../utils/colors'
import { exportToExcel, exportToPDF } from '../../utils/exportHelpers'
import { listContainer, listRow } from '../../utils/motion'

export default function Students() {
  const toast = useToast()
  const { data, loading, error, reload } = useApiData('/users?role=student')
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [profileStudent, setProfileStudent] = useState(null)
  const [assignStudent, setAssignStudent] = useState(null)

  const deleteUser = async (id, name) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return
    try {
      await api(`/users/${id}`, { method: 'DELETE' })
      toast(`${name} deleted.`, 'error')
      reload()
    } catch (err) {
      toast(err.message || 'Delete failed.', 'error')
    }
  }

  const exportStudents = () => {
    if (!data.length) { toast('No students to export.', 'warning'); return }
    const rows = data.map((u) => ({
      Name: u.name || '', 'Roll No': u.rollNo || '', Email: u.email || '', Room: u.room || '',
      Block: u.block || '', Branch: u.branch || '', Year: u.year || '', Phone: u.phone || '',
      'Fee Status': u.feeStatus || 'due',
    }))
    exportToExcel(rows, [20, 12, 26, 10, 10, 20, 8, 16, 12], 'Students', `Students_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast('Students exported to Excel!', 'success')
  }

  const exportStudentsPDF = () => {
    if (!data.length) { toast('No students to export.', 'warning'); return }
    const body = data.map((u) => [u.name || '', u.rollNo || '', u.email || '', u.room || '-', u.branch || '-', String(u.year || '-'), u.feeStatus || 'due'])
    exportToPDF({
      title: 'SmartHostel ERP - Students Report', totalLabel: 'Total Students', totalCount: data.length,
      head: ['Name', 'Roll No', 'Email', 'Room', 'Branch', 'Year', 'Fee'], body,
      filename: `Students_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
    })
    toast('PDF report downloaded!', 'success')
  }

  return (
    <>
      <SectionHeader
        title="Manage Students"
        actions={(
          <>
            <button className="btn btn-outline-green" onClick={exportStudents}>⬇ Excel</button>
            <button className="btn btn-outline-red" onClick={exportStudentsPDF}>⬇ PDF</button>
            <button className="btn btn-primary" onClick={() => setUserModalOpen(true)}>+ Add Student</button>
          </>
        )}
      />
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Roll No</th><th>Email</th><th>Room</th><th>Branch</th><th>Year</th><th>Actions</th></tr></thead>
            <motion.tbody variants={listContainer} initial="hidden" animate="visible">
              {loading && <SkeletonRows cols={7} />}
              {!loading && error && <EmptyRow colSpan={7} message="Could not load students" tone="error" />}
              {!loading && !error && data.length === 0 && <EmptyRow colSpan={7} message="No students yet" />}
              {!loading && !error && data.map((u, i) => (
                <motion.tr key={u._id} variants={listRow}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar initials={(u.name || 'S').split(' ').map((w) => w[0]).join('').toUpperCase()} color={AVATAR_COLORS[i % AVATAR_COLORS.length]} size={28} />
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-sec)' }}>{u.rollNo || '—'}</td>
                  <td style={{ color: 'var(--text-sec)' }}>{u.email}</td>
                  <td style={{ color: 'var(--text-sec)' }}>{u.room || '—'}</td>
                  <td style={{ color: 'var(--text-sec)' }}>{u.branch || '—'}</td>
                  <td style={{ color: 'var(--text-sec)' }}>{u.year || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button className="btn btn-sm btn-outline-blue" onClick={() => setProfileStudent(u)}>View</button>
                      <button className="btn btn-sm btn-outline-green" onClick={() => setAssignStudent({ id: u._id, name: u.name })}>🏠 Assign</button>
                      <button className="btn btn-sm btn-outline-red" onClick={() => deleteUser(u._id, u.name)}>Delete</button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </div>

      <UserModal open={userModalOpen} role="student" onClose={() => setUserModalOpen(false)} onCreated={reload} />
      <ProfileModal open={!!profileStudent} student={profileStudent} onClose={() => setProfileStudent(null)} />
      <AssignRoomModal
        open={!!assignStudent}
        student={assignStudent}
        onClose={() => setAssignStudent(null)}
        onAssigned={reload}
      />
    </>
  )
}
