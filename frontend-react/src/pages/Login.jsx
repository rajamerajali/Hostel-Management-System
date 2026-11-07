import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../auth/AuthContext'
import { useTheme, COLOR_THEMES } from '../contexts/ThemeContext'
import { api } from '../api/client'
import Icon from '../components/ui/Icon'
import { PASSWORD_REGEX, PASSWORD_HINT } from '../utils/validators'
import { fadeUp, staggerContainer, staggerItem, panelSlide } from '../utils/motion'
import './login.css'

const ROLE_CONFIG = {
  admin:   { color: '#b794f4', bg: 'rgba(127,156,245,.18)', demo: 'admin@hostel.edu / Admin@123',   label: 'Administrator', icon: 'shield',   desc: 'Full system access & analytics dashboard' },
  warden:  { color: '#4fd1c5', bg: 'rgba(79,209,197,.18)',  demo: 'warden@hostel.edu / Warden@123', label: 'Warden / Staff', icon: 'building', desc: 'Room allocation & hostel operations' },
  student: { color: '#f687b3', bg: 'rgba(246,135,179,.18)', demo: 'arjun@edu.in / Student@123',     label: 'Student',        icon: 'user',     desc: 'Personal hostel dashboard & services' },
}
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
const REGISTER_GRADIENT = {
  admin: 'linear-gradient(135deg,#b794f4,#7f9cf5)',
  warden: 'linear-gradient(135deg,#4fd1c5,#63b3ed)',
  student: 'linear-gradient(135deg,#f687b3,#b794f4)',
}

export default function Login() {
  const { user, login } = useAuth()
  const [view, setView] = useState('roles') // roles | login | register | forgot
  const [selectedRole, setSelectedRole] = useState(null)

  // Pure read (lazy initializer, no side effect during render — the actual
  // write happens in the effect below, once).
  const [isReturning] = useState(() => !!localStorage.getItem('hostel_visited'))
  useEffect(() => { localStorage.setItem('hostel_visited', 'true') }, [])

  // Switching views (roles -> login -> register etc.) changes the content
  // height; without this, the browser leaves/moves the scroll position in a
  // way that can hide the heading at the top instead of resetting to it.
  useEffect(() => {
    document.querySelector('.login-page')?.scrollTo(0, 0)
  }, [view])

  // Already logged in — redirect straight to the right dashboard.
  if (user) return <Navigate to={`/${user.role}`} replace />

  const showRoles = () => { setView('roles'); setSelectedRole(null) }
  const selectRole = (role) => { setSelectedRole(role); setView('login') }

  const heading = {
    roles: isReturning ? 'Welcome Back' : 'Welcome',
    login: 'Sign In',
    register: 'Register',
    forgot: 'Reset Password',
  }[view]
  const subheading = {
    roles: 'Enterprise Hostel Management Platform',
    login: selectedRole ? `Logging in as ${ROLE_CONFIG[selectedRole].label}` : '',
    register: selectedRole ? `Create your ${selectedRole} account` : '',
    forgot: 'Reset your password via OTP',
  }[view]

  return (
    <div className="login-page">
      <div className="orb" style={{ width: 420, height: 420, left: '2%', top: '5%', background: 'radial-gradient(circle,rgba(66,153,225,.12) 0%,transparent 70%)', animation: 'float 4s ease-in-out infinite' }} />
      <div className="orb" style={{ width: 320, height: 320, right: '5%', bottom: '10%', background: 'radial-gradient(circle,rgba(127,156,245,.1) 0%,transparent 70%)', animation: 'float 4s ease-in-out infinite 1.5s' }} />
      <div className="orb" style={{ width: 260, height: 260, left: '45%', top: '50%', background: 'radial-gradient(circle,rgba(79,209,197,.08) 0%,transparent 70%)', animation: 'float 4s ease-in-out infinite .8s' }} />

      <ThemeFab />

      <div className="login-page-inner">
        <div style={{ position: 'relative', width: '100%', maxWidth: 860, zIndex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div key={view} variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              <div style={{ textAlign: 'center', marginBottom: view === 'roles' ? 36 : 20 }}>
                {view === 'roles' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderRadius: 50, background: 'var(--lp-card)', border: '1px solid var(--lp-border)', marginBottom: 22 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#4299e1,#7f9cf5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="building" size={18} color="#fff" />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '.3px' }}>SmartHostel ERP</span>
                  </div>
                )}
                <h1 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, letterSpacing: '-.5px', lineHeight: 1.15, color: 'var(--lp-text)' }}>{heading}</h1>
                <p style={{ color: 'var(--lp-text-sec)', marginTop: 8, fontSize: 15 }}>{subheading}</p>
              </div>

              {view === 'roles' && <RoleCards onSelect={selectRole} />}
              {view === 'login' && (
                <LoginForm
                  role={selectedRole}
                  onLogin={login}
                  onBack={showRoles}
                  onRegister={() => setView('register')}
                  onForgot={() => setView('forgot')}
                />
              )}
              {view === 'register' && (
                <RegisterForm role={selectedRole} onLogin={login} onBack={showRoles} onSwitchToLogin={() => setView('login')} />
              )}
              {view === 'forgot' && <ForgotPassword onBack={showRoles} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// Same emoji-icon look as the dashboard's Topbar theme picker (Icon component
// isn't used here since these are literal emoji characters, not the app's
// stroke-SVG icon set).
function ThemeFab() {
  const { themeName, setThemeName } = useTheme()
  const [open, setOpen] = useState(false)
  const theme = COLOR_THEMES.find((t) => t.name === themeName) || COLOR_THEMES[0]

  useEffect(() => {
    if (!open) return
    const onClick = (e) => { if (!e.target.closest('#login-theme-menu')) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div id="login-theme-menu" style={{ position: 'fixed', top: 16, right: 16, zIndex: 999 }}>
      <motion.div className="theme-fab" onClick={() => setOpen((o) => !o)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.94 }}>
        <span style={{ fontSize: 18 }}>{theme.icon}</span>
      </motion.div>
      <AnimatePresence>
        {open && (
          <motion.div className="theme-panel" variants={panelSlide} initial="hidden" animate="visible" exit="exit" style={{ position: 'absolute', top: 50, right: 0 }}>
            {COLOR_THEMES.map((t) => (
              <div key={t.name} className={`theme-opt${themeName === t.name ? ' active' : ''}`} onClick={() => { setThemeName(t.name); setOpen(false) }}>
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                <span>{t.name}</span>
                <div className="theme-dot" style={{ marginLeft: 'auto', background: t.color }} />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function RoleCards({ onSelect }) {
  return (
    <motion.div id="role-cards" variants={staggerContainer} initial="hidden" animate="visible">
      {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
        <motion.div
          key={role}
          className="login-card role-card"
          variants={staggerItem}
          whileHover={{ y: -4, boxShadow: `0 12px 40px ${cfg.color}30` }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          style={{ borderTop: `2px solid ${cfg.color}` }}
          onClick={() => onSelect(role)}
        >
          <div style={{ position: 'absolute', right: -20, bottom: -20, width: 80, height: 80, borderRadius: '50%', background: `${cfg.color}1f` }} />
          <div style={{ width: 52, height: 52, borderRadius: 14, background: `${cfg.color}33`, border: `1.5px solid ${cfg.color}4d`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <Icon name={cfg.icon} size={24} color={cfg.color} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--lp-text)' }}>{cfg.label}</h3>
          <p style={{ fontSize: 13, color: 'var(--lp-text-sec)', lineHeight: 1.5, marginBottom: 18 }}>{cfg.desc}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: `${cfg.color}1a` }}>
            <Icon name="user" size={12} color="var(--lp-text-muted)" />
            <span style={{ fontSize: 11, color: 'var(--lp-text-muted)', fontFamily: 'monospace' }}>{cfg.demo.split(' / ')[0]}</span>
          </div>
          <div style={{ position: 'absolute', bottom: 20, right: 20 }}>
            <Icon name="chevron_right" size={18} color={cfg.color} />
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}

function LoginForm({ role, onLogin, onBack, onRegister, onForgot }) {
  const cfg = ROLE_CONFIG[role]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('⚠ Please fill all fields.'); return }
    setLoading(true)
    try {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } })
      if (data.user.role !== role) {
        const roleNames = { admin: 'Administrator', warden: 'Warden', student: 'Student' }
        setError(`✗ This account is registered as ${roleNames[data.user.role]}. Please use the ${roleNames[data.user.role]} login.`)
        setLoading(false)
        return
      }
      onLogin(data.token, data.user)
    } catch (err) {
      let msg = err.message || 'Connection failed. Is server running?'
      if (msg.toLowerCase().includes('invalid credentials')) msg = 'Account Not Found'
      setError('✗ ' + msg)
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, width: '100%', margin: '0 auto' }}>
      <form className="login-card" style={{ padding: 32 }} onSubmit={submit}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, border: `1.5px solid ${cfg.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name={cfg.icon} size={20} color={cfg.color} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--lp-text)' }}>{cfg.label}</div>
            <div style={{ fontSize: 12, color: 'var(--lp-text-sec)' }}>Sign in to your account</div>
          </div>
        </div>

        <div className="demo-box" style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}33` }}>
          <div style={{ color: cfg.color, fontWeight: 700, fontSize: 11, marginBottom: 4 }}>Demo Credentials</div>
          <div className="mono" style={{ color: 'var(--lp-text-sec)' }}>{cfg.demo}</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label-sm">Email Address</label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><Icon name="mail" size={16} color="var(--lp-text-muted)" /></div>
            <input type="email" className="login-input" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="form-label-sm">Password</label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><Icon name="lock" size={16} color="var(--lp-text-muted)" /></div>
            <input type="password" className="login-input" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <p className="lp-err">{error}</p>
        <button type="submit" className="login-btn-primary" disabled={loading} style={{ background: `linear-gradient(135deg,${cfg.color},${cfg.color}cc)` }}>
          {loading ? <div className="login-spinner" /> : 'Sign In →'}
        </button>
        <div className="switch-link">
          {role === 'student' ? (
            <>New student? <span onClick={onRegister}>Create an account</span></>
          ) : (
            <span style={{ color: 'var(--lp-text-muted)', cursor: 'default' }}>Contact your administrator for account access.</span>
          )}
        </div>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <span onClick={onForgot} style={{ fontSize: 12, color: 'var(--lp-text-sec)', cursor: 'pointer' }}>
            Forgot Password? <span style={{ color: '#f687b3', fontWeight: 700 }}>Reset here</span>
          </span>
        </div>
        <button type="button" className="back-btn" onClick={onBack}>← Back to Roles</button>
      </form>
    </div>
  )
}

function RegisterForm({ role, onLogin, onBack, onSwitchToLogin }) {
  const cfg = ROLE_CONFIG[role]
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', phone: '', rollNo: '', branch: '', year: '1' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const { name, email, password, confirm, phone, rollNo, branch, year } = form
    if (!name.trim() || !email.trim() || !password || !confirm) { setError('⚠ Please fill all required (*) fields.'); return }
    if (!EMAIL_REGEX.test(email.trim())) { setError('⚠ Please enter a valid email address.'); return }
    if (!PASSWORD_REGEX.test(password)) { setError('⚠ ' + PASSWORD_HINT); return }
    if (password !== confirm) { setError('⚠ Passwords do not match.'); return }

    setLoading(true)
    // Public self-signup is student-only now — role isn't sent (the server
    // always creates a student here regardless; admin/warden accounts are
    // created by an existing admin instead).
    const body = { name: name.trim(), email: email.trim(), password, phone: phone.trim() }
    if (role === 'student') {
      body.rollNo = rollNo.trim()
      body.branch = branch.trim()
      body.year = Number(year)
    }
    try {
      const data = await api('/auth/register', { method: 'POST', body })
      onLogin(data.token, data.user)
    } catch (err) {
      setError('✗ ' + (err.message || 'Connection failed. Is server running?'))
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
      <form className="login-card" style={{ padding: 32 }} onSubmit={submit}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, border: `1.5px solid ${cfg.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name={cfg.icon} size={20} color={cfg.color} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--lp-text)' }}>Create {cfg.label} Account</div>
            <div style={{ fontSize: 12, color: 'var(--lp-text-sec)' }}>Register to access your dashboard</div>
          </div>
        </div>

        <div className="grid-2-reg">
          <div style={{ marginBottom: 14 }}><label className="form-label-sm">Full Name *</label><input className="login-input no-icon" value={form.name} onChange={set('name')} placeholder="e.g. Ali Khan" /></div>
          {role === 'student' ? (
            <div style={{ marginBottom: 14 }}><label className="form-label-sm">Roll Number</label><input className="login-input no-icon" value={form.rollNo} onChange={set('rollNo')} placeholder="e.g. 22CS010" /></div>
          ) : <div />}
        </div>

        <div style={{ marginBottom: 14 }}><label className="form-label-sm">Email Address *</label><input type="email" className="login-input no-icon" value={form.email} onChange={set('email')} placeholder="e.g. ali@edu.pk" /></div>

        <div className="grid-2-reg">
          <div style={{ marginBottom: 14 }}><label className="form-label-sm">Password *</label><input type="password" className="login-input no-icon" value={form.password} onChange={set('password')} placeholder="Min 8 chars, upper+lower+number" /></div>
          <div style={{ marginBottom: 14 }}><label className="form-label-sm">Confirm Password *</label><input type="password" className="login-input no-icon" value={form.confirm} onChange={set('confirm')} placeholder="Re-enter password" /></div>
        </div>

        {role === 'student' && (
          <div className="grid-2-reg">
            <div style={{ marginBottom: 14 }}><label className="form-label-sm">Branch</label><input className="login-input no-icon" value={form.branch} onChange={set('branch')} placeholder="e.g. Computer Science" /></div>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label-sm">Year</label>
              <select className="login-input no-icon" value={form.year} onChange={set('year')}>
                <option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option>
              </select>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}><label className="form-label-sm">Phone Number</label><input className="login-input no-icon" value={form.phone} onChange={set('phone')} placeholder="e.g. 0300-1234567" /></div>

        <p className="lp-err">{error}</p>
        <button type="submit" className="login-btn-primary" disabled={loading} style={{ background: REGISTER_GRADIENT[role] }}>
          {loading ? <div className="login-spinner" /> : 'Create Account →'}
        </button>
        <div className="switch-link">Already have an account? <span onClick={onSwitchToLogin}>Sign in</span></div>
        <button type="button" className="back-btn" onClick={onBack}>← Back to Roles</button>
      </form>
    </div>
  )
}

function ForgotPassword({ onBack }) {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const sendOTP = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('⚠ Please enter your email.'); return }
    if (!EMAIL_REGEX.test(email.trim())) { setError('⚠ Please enter a valid email.'); return }
    setLoading(true)
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email: email.trim() } })
      setStep(2)
    } catch (err) {
      setError('✗ ' + (err.message || 'Failed to send OTP'))
    }
    setLoading(false)
  }

  const verifyOTP = async (e) => {
    e.preventDefault()
    setError('')
    if (!otp || otp.length < 6) { setError('⚠ Please enter the 6-digit OTP.'); return }
    setLoading(true)
    try {
      await api('/auth/verify-otp', { method: 'POST', body: { email: email.trim(), otp } })
      setStep(3)
    } catch (err) {
      setError('✗ ' + (err.message || 'Invalid OTP'))
    }
    setLoading(false)
  }

  const resetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (!newPassword || !confirm) { setError('⚠ Please fill both fields.'); return }
    if (!PASSWORD_REGEX.test(newPassword)) { setError('⚠ ' + PASSWORD_HINT); return }
    if (newPassword !== confirm) { setError('⚠ Passwords do not match.'); return }
    setLoading(true)
    try {
      await api('/auth/reset-password', { method: 'POST', body: { email: email.trim(), otp, newPassword } })
      setDone(true)
      setTimeout(onBack, 1200)
    } catch (err) {
      setError('✗ ' + (err.message || 'Reset failed'))
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, width: '100%', margin: '0 auto' }}>
      <div className="login-card" style={{ padding: 32 }}>
        {step === 1 && (
          <form onSubmit={sendOTP}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔐</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--lp-text)' }}>Forgot Password?</div>
              <div style={{ fontSize: 12, color: 'var(--lp-text-sec)', marginTop: 6 }}>Enter your registered email</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label-sm">Registered Email</label>
              <input type="email" className="login-input no-icon" placeholder="e.g. ali@edu.pk" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <p className="lp-err">{error}</p>
            <button type="submit" className="login-btn-primary" disabled={loading} style={{ background: 'linear-gradient(135deg,#4299e1,#7f9cf5)' }}>
              {loading ? <div className="login-spinner" /> : 'Send OTP →'}
            </button>
            <button type="button" className="back-btn" onClick={onBack}>← Back to Login</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verifyOTP}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📧</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--lp-text)' }}>Verify OTP</div>
              <div style={{ fontSize: 12, color: 'var(--lp-text-sec)', marginTop: 6 }}>OTP sent to: {email}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label-sm">6-Digit OTP</label>
              <input className="login-input no-icon" placeholder="- - - - - -" maxLength={6} style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, letterSpacing: 10 }} value={otp} onChange={(e) => setOtp(e.target.value)} />
            </div>
            <p className="lp-err">{error}</p>
            <button type="submit" className="login-btn-primary" disabled={loading} style={{ background: 'linear-gradient(135deg,#4299e1,#7f9cf5)' }}>
              {loading ? <div className="login-spinner" /> : 'Verify OTP →'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <span onClick={sendOTP} style={{ fontSize: 12, color: 'var(--lp-text-sec)', cursor: 'pointer', textDecoration: 'underline' }}>Didn't receive OTP? Resend</span>
            </div>
            <button type="button" className="back-btn" onClick={() => setStep(1)}>← Back</button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={resetPassword}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔑</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--lp-text)' }}>Set New Password</div>
              <div style={{ fontSize: 12, color: 'var(--lp-text-sec)', marginTop: 6 }}>Choose a strong new password</div>
            </div>
            <div style={{ marginBottom: 14 }}><label className="form-label-sm">New Password *</label><input type="password" className="login-input no-icon" placeholder="Min 8 chars, upper+lower+number" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
            <div style={{ marginBottom: 14 }}><label className="form-label-sm">Confirm Password *</label><input type="password" className="login-input no-icon" placeholder="Re-enter password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
            <p className="lp-err">{done ? '✓ Password Reset! Redirecting…' : error}</p>
            <button type="submit" className="login-btn-primary" disabled={loading || done} style={{ background: done ? '#68d391' : 'linear-gradient(135deg,#f687b3,#b794f4)' }}>
              {loading ? <div className="login-spinner" /> : done ? '✓ Password Reset!' : 'Reset Password →'}
            </button>
            <button type="button" className="back-btn" onClick={() => setStep(2)}>← Back</button>
          </form>
        )}
      </div>
    </div>
  )
}
