import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { PASSWORD_REGEX, PASSWORD_HINT } from '../../utils/validators'

const emptyForm = { name: '', email: '', password: '', phone: '', rollNo: '', branch: '', year: '1', room: '' }

// Shared Add Student / Add Warden form (role-toggled), same as the old user-modal.
export default function UserModal({ open, role, onClose, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (open) setForm(emptyForm)
  }, [open, role])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async () => {
    const name = form.name.trim()
    const email = form.email.trim()
    const password = form.password
    const phone = form.phone.trim()
    if (!name || !email || !password) { toast('Please fill name, email & password.', 'warning'); return }
    if (!PASSWORD_REGEX.test(password)) { toast(PASSWORD_HINT, 'warning'); return }

    const body = { name, email, password, phone, role }
    if (role === 'student') {
      body.rollNo = form.rollNo.trim()
      body.branch = form.branch.trim()
      body.year = Number(form.year)
      body.room = form.room.trim()
    }

    try {
      await api('/users', { method: 'POST', body })
      toast(`${role === 'student' ? 'Student' : 'Warden'} added successfully!`, 'success')
      onClose()
      onCreated()
    } catch (err) {
      toast(err.message || 'Failed to add user.', 'error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={role === 'student' ? 'Add New Student' : 'Add New Warden'}>
      <div className="grid-2" style={{ marginBottom: 0 }}>
        <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={set('name')} placeholder="e.g. Ali Khan" /></div>
        <div className="form-group"><label className="form-label">Email *</label><input className="form-input" value={form.email} onChange={set('email')} placeholder="e.g. ali@edu.pk" /></div>
      </div>
      <div className="grid-2" style={{ marginBottom: 0 }}>
        <div className="form-group"><label className="form-label">Password *</label><input className="form-input" value={form.password} onChange={set('password')} placeholder="Min 8 chars, upper+lower+number" /></div>
        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={set('phone')} placeholder="e.g. 0300-1234567" /></div>
      </div>
      {role === 'student' && (
        <div>
          <div className="grid-2" style={{ marginBottom: 0 }}>
            <div className="form-group"><label className="form-label">Roll No</label><input className="form-input" value={form.rollNo} onChange={set('rollNo')} placeholder="e.g. 22CS010" /></div>
            <div className="form-group"><label className="form-label">Branch</label><input className="form-input" value={form.branch} onChange={set('branch')} placeholder="e.g. Computer Science" /></div>
          </div>
          <div className="grid-2" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="form-select" value={form.year} onChange={set('year')}>
                <option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Room</label><input className="form-input" value={form.room} onChange={set('room')} placeholder="e.g. A-101" /></div>
          </div>
        </div>
      )}
      <button className="btn btn-primary btn-full" onClick={submit}>Create Account</button>
    </Modal>
  )
}
