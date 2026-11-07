import { useState } from 'react'
import { motion } from 'framer-motion'
import SectionHeader from '../../components/ui/SectionHeader'
import SkeletonRows from '../../components/ui/SkeletonRows'
import { EmptyRow } from '../../components/ui/EmptyState'
import Avatar from '../../components/ui/Avatar'
import UserModal from '../../components/modals/UserModal'
import { useApiData } from '../../hooks/useApiData'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { listContainer, listRow } from '../../utils/motion'

export default function Wardens() {
  const toast = useToast()
  const { data, loading, error, reload } = useApiData('/users?role=warden')
  const [userModalOpen, setUserModalOpen] = useState(false)

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

  return (
    <>
      <SectionHeader
        title="Manage Wardens / Staff"
        actions={<button className="btn btn-primary" onClick={() => setUserModalOpen(true)}>+ Add Warden</button>}
      />
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Actions</th></tr></thead>
            <motion.tbody variants={listContainer} initial="hidden" animate="visible">
              {loading && <SkeletonRows cols={5} />}
              {!loading && error && <EmptyRow colSpan={5} message="Could not load wardens" tone="error" />}
              {!loading && !error && data.length === 0 && <EmptyRow colSpan={5} message="No wardens yet" />}
              {!loading && !error && data.map((u) => (
                <motion.tr key={u._id} variants={listRow}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar initials={(u.name || 'W').split(' ').map((w) => w[0]).join('').toUpperCase()} color="#4fd1c5" size={28} />
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-sec)' }}>{u.email}</td>
                  <td style={{ color: 'var(--text-sec)' }}>{u.phone || '—'}</td>
                  <td><span className="badge" style={{ background: '#4fd1c522', color: '#4fd1c5' }}>Warden</span></td>
                  <td><button className="btn btn-sm btn-outline-red" onClick={() => deleteUser(u._id, u.name)}>Delete</button></td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </div>

      <UserModal open={userModalOpen} role="warden" onClose={() => setUserModalOpen(false)} onCreated={reload} />
    </>
  )
}
