import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { PASSWORD_REGEX, PASSWORD_HINT } from '../../utils/validators'

const emptyPasswordForm = { current: '', next: '', confirm: '' }

// Self-service "My Profile" — edit own basic details and change password.
// Reachable from the Topbar user-menu dropdown for all 3 roles.
export default function AccountModal({ open, onClose }) {
  const { user, updateUser } = useAuth()
  const toast = useToast()

  const [tab, setTab] = useState('profile')
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' })
  const [savingProfile, setSavingProfile] = useState(false)

  const [pw, setPw] = useState(emptyPasswordForm)
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    if (open) {
      setTab('profile')
      setProfile({ name: user.name || '', email: user.email || '', phone: user.phone || '' })
      setPw(emptyPasswordForm)
    }
  }, [open, user])

  const setProfileField = (key) => (e) => setProfile((f) => ({ ...f, [key]: e.target.value }))
  const setPwField = (key) => (e) => setPw((f) => ({ ...f, [key]: e.target.value }))

  const saveProfile = async () => {
    const name = profile.name.trim()
    if (!name) { toast('Name is required.', 'warning'); return }
    setSavingProfile(true)
    try {
      // Email is never sent here — it's the login identifier and is locked
      // to read-only in this self-service form (see the disabled input below).
      const res = await api(`/users/${user.id}`, { method: 'PUT', body: { name, phone: profile.phone.trim() } })
      updateUser({ name: res.data.name, phone: res.data.phone })
      toast('Profile updated!', 'success')
    } catch (err) {
      toast(err.message || 'Failed to update profile.', 'error')
    }
    setSavingProfile(false)
  }

  const changePassword = async () => {
    if (!pw.current || !pw.next || !pw.confirm) { toast('Please fill all password fields.', 'warning'); return }
    if (!PASSWORD_REGEX.test(pw.next)) { toast(PASSWORD_HINT, 'warning'); return }
    if (pw.next !== pw.confirm) { toast('New passwords do not match.', 'warning'); return }
    setChangingPw(true)
    try {
      await api('/auth/change-password', { method: 'PUT', body: { currentPassword: pw.current, newPassword: pw.next } })
      toast('Password changed successfully!', 'success')
      setPw(emptyPasswordForm)
    } catch (err) {
      toast(err.message || 'Failed to change password.', 'error')
    }
    setChangingPw(false)
  }

  const tabStyle = (name) => ({
    flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 8, cursor: 'pointer',
    fontSize: 13, fontWeight: 700, transition: 'all .15s',
    background: tab === name ? 'linear-gradient(135deg,var(--accent),var(--accent-2))' : 'transparent',
    color: tab === name ? '#fff' : 'var(--text-sec)',
  })

  return (
    <Modal open={open} onClose={onClose} title="My Profile" subtitle={user?.role} maxWidth={460}>
      <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 10, background: 'var(--hover)', marginBottom: 20 }}>
        <div style={tabStyle('profile')} onClick={() => setTab('profile')}>Profile</div>
        <div style={tabStyle('password')} onClick={() => setTab('password')}>Password</div>
      </div>

      {tab === 'profile' && (
        <>
          <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={profile.name} onChange={setProfileField('name')} /></div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={profile.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Email is your login ID and can't be changed here.</div>
          </div>
          <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={profile.phone} onChange={setProfileField('phone')} placeholder="e.g. 0300-1234567" /></div>
          <button className="btn btn-primary btn-full" onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      )}

      {tab === 'password' && (
        <>
          <div className="form-group"><label className="form-label">Current Password</label><input className="form-input" type="password" autoComplete="new-password" value={pw.current} onChange={setPwField('current')} /></div>
          <div className="form-group"><label className="form-label">New Password</label><input className="form-input" type="password" autoComplete="new-password" value={pw.next} onChange={setPwField('next')} placeholder="Min 8 chars, upper+lower+number" /></div>
          <div className="form-group"><label className="form-label">Confirm New Password</label><input className="form-input" type="password" autoComplete="new-password" value={pw.confirm} onChange={setPwField('confirm')} /></div>
          <button className="btn btn-outline-blue btn-full" onClick={changePassword} disabled={changingPw}>
            {changingPw ? 'Updating...' : 'Update Password'}
          </button>
        </>
      )}
    </Modal>
  )
}
