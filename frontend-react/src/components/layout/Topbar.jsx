import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Icon from '../ui/Icon'
import { useAuth } from '../../auth/AuthContext'
import { useNotifications } from '../../contexts/NotificationsContext'
import { COLOR_THEMES, useTheme } from '../../contexts/ThemeContext'
import { initials } from '../../utils/format'
import { panelSlide } from '../../utils/motion'
import { api } from '../../api/client'

const iconBtnMotion = { whileHover: { y: -1, scale: 1.05 }, whileTap: { scale: 0.94 }, transition: { type: 'spring', stiffness: 420, damping: 25 } }

const ROLE_COLOR = { admin: '#7f9cf5', warden: '#4fd1c5', student: '#f687b3' }

// Where a clicked result should send each role — only categories with a real
// destination page for that role are ever requested from the backend.
const RESULT_PATH = {
  admin:   { students: '/admin/students', rooms: '/admin/rooms', complaints: '/admin/complaints', announcements: '/admin/announcements' },
  warden:  { rooms: '/warden/dashboard', complaints: '/warden/complaints', announcements: '/warden/announcements' },
  student: { complaints: '/student/complaints', announcements: '/student/announcements' },
}
const CATEGORY_LABEL = { students: 'Students', rooms: 'Rooms', complaints: 'Complaints', announcements: 'Announcements' }
const CATEGORY_ICON = { students: 'users', rooms: 'bed', complaints: 'alert', announcements: 'bell' }

function GlobalSearch() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (query.trim().length < 2) { setResults(null); setLoading(false); return }
    setLoading(true)
    timerRef.current = setTimeout(() => {
      api(`/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => setResults(r.data))
        .catch(() => setResults(null))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timerRef.current)
  }, [query])

  useEffect(() => {
    if (!open) return
    const onClick = (e) => { if (!e.target.closest('#global-search')) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const paths = RESULT_PATH[user.role] || {}
  const categories = Object.keys(paths).filter((c) => results?.[c]?.length)
  const hasAnyResults = categories.length > 0

  const goTo = (category) => {
    navigate(paths[category])
    setOpen(false)
    setQuery('')
  }

  const itemLabel = (category, item) => {
    if (category === 'students') return `${item.name}${item.rollNo ? ` · ${item.rollNo}` : ''}`
    if (category === 'rooms') return `Room ${item.number} · Block ${item.block}`
    if (category === 'complaints') return item.title
    return item.title
  }

  return (
    <div className={`search-wrap${open ? ' expanded' : ''}`} id="global-search">
      {/* On mobile this icon is the collapsed button — tapping it expands
          the input into the topbar's free space and focuses it. On desktop
          the input is already visible, so this just refocuses it. */}
      <div
        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 1, cursor: 'pointer' }}
        onClick={() => { setOpen(true); inputRef.current?.focus() }}
      >
        <Icon name="search" size={14} color="var(--text-muted)" />
      </div>
      <input
        ref={inputRef}
        className="search-input"
        placeholder="Search..."
        autoComplete="off"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
      />
      <AnimatePresence>
        {open && query.trim().length >= 2 && (
          <motion.div
            variants={panelSlide} initial="hidden" animate="visible" exit="exit"
            style={{
              position: 'absolute', top: 44, left: 0, width: 'min(280px, calc(100vw - 24px))', background: 'var(--sidebar)',
              border: '1px solid var(--card-border)', borderRadius: 14, padding: 8,
              zIndex: 300, boxShadow: '0 12px 28px rgba(0,0,0,0.3)', maxHeight: 360, overflowY: 'auto',
            }}
          >
            {loading && <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Searching...</div>}
            {!loading && !hasAnyResults && <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>No results found</div>}
            {!loading && categories.map((category) => (
              <div key={category} style={{ marginBottom: 6 }}>
                <div style={{ padding: '6px 10px 2px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  {CATEGORY_LABEL[category]}
                </div>
                {results[category].map((item) => (
                  <div
                    key={item._id}
                    onClick={() => goTo(category)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <Icon name={CATEGORY_ICON[category]} size={14} color="var(--text-sec)" />
                    <span style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemLabel(category, item)}</span>
                  </div>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Topbar({ title, openPanel, setOpenPanel, onOpenProfile, onOpenMobileNav }) {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const { themeName, setThemeName } = useTheme()
  const roleColor = ROLE_COLOR[user.role]
  const theme = COLOR_THEMES.find((t) => t.name === themeName) || COLOR_THEMES[0]

  const toggle = (name) => setOpenPanel((p) => (p === name ? null : name))

  return (
    <div id="topbar">
      <motion.div className="icon-btn hamburger-btn" onClick={onOpenMobileNav} {...iconBtnMotion}>
        <Icon name="menu" size={18} color="var(--text-sec)" />
      </motion.div>

      <div className="topbar-title">
        <h2>{title}</h2>
        <p>{new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <GlobalSearch />

      <div style={{ position: 'relative' }} id="color-theme-btn">
        <motion.div className="icon-btn" onClick={() => toggle('theme')} {...iconBtnMotion}>
          <span>{theme.icon}</span>
        </motion.div>
        <AnimatePresence>
          {openPanel === 'theme' && (
            <motion.div
              variants={panelSlide} initial="hidden" animate="visible" exit="exit"
              style={{
                position: 'absolute', top: 50, right: 0, background: 'var(--sidebar)',
                border: '1px solid var(--card-border)', borderRadius: 14, padding: 8, minWidth: 140,
                zIndex: 300, boxShadow: '0 12px 28px rgba(0,0,0,0.3)',
              }}>
              {COLOR_THEMES.map((t) => (
                <div
                  key={t.name}
                  onClick={() => { setThemeName(t.name); setOpenPanel(null) }}
                  style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{t.name}</span>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, marginLeft: 'auto' }} />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div className="icon-btn" id="notif-btn" style={{ position: 'relative' }} onClick={() => toggle('notif')} {...iconBtnMotion}>
        <Icon name="bell" size={16} color="var(--text-sec)" />
        {unreadCount > 0 && (
          <div className="notif-dot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', minWidth: 16, height: 16, padding: '0 4px' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </motion.div>

      <div style={{ position: 'relative' }} id="user-menu">
        <motion.div
          className="user-avatar"
          style={{ background: `${roleColor}33`, border: `1.5px solid ${roleColor}55`, color: roleColor }}
          title={user.name}
          onClick={() => toggle('user')}
          {...iconBtnMotion}
        >
          {initials(user.name)}
        </motion.div>

        <AnimatePresence>
          {openPanel === 'user' && (
            <motion.div
              variants={panelSlide} initial="hidden" animate="visible" exit="exit"
              style={{
                position: 'absolute', top: 42, right: 0, background: 'var(--sidebar)',
                border: '1px solid var(--card-border)', borderRadius: 14, minWidth: 200,
                zIndex: 300, boxShadow: '0 12px 40px rgba(0,0,0,.4)', overflow: 'hidden',
              }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{user.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email || ''}</div>
                <span className="badge" style={{ marginTop: 6, display: 'inline-block', background: `${roleColor}22`, color: roleColor }}>{user.role}</span>
              </div>
              <div onClick={() => { setOpenPanel(null); onOpenProfile() }} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: '1px solid var(--divider)' }}>
                <Icon name="user" size={16} color="var(--text-sec)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>My Profile</span>
              </div>
              <div onClick={logout} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <Icon name="logout" size={16} color="#fc8181" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fc8181' }}>Sign Out</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
