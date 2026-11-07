import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import Icon from '../ui/Icon'
import { useAuth } from '../../auth/AuthContext'
import { useNotifications } from '../../contexts/NotificationsContext'

const ROLE_COLOR = { admin: '#7f9cf5', warden: '#4fd1c5', student: '#f687b3' }
const ROLE_ICON = { admin: 'shield', warden: 'building', student: 'user' }

const MotionNavLink = motion.create(NavLink)

export default function Sidebar({ navItems, mobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth()
  const { unreadBySection } = useNotifications()
  const [collapsed, setCollapsed] = useState(false)
  const roleColor = ROLE_COLOR[user.role]

  return (
    <div id="sidebar" className={`${collapsed ? 'collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-icon"><Icon name="building" size={18} color="#fff" /></div>
        <div className="logo-text">
          <div className="logo-title">SmartHostel</div>
          <div className="logo-sub">ERP Platform</div>
        </div>
        <div className="mobile-close-btn" onClick={onCloseMobile}>
          <Icon name="x" size={16} color="var(--text-sec)" />
        </div>
      </div>

      <div className="role-badge" style={{ background: `${roleColor}18`, border: `1px solid ${roleColor}33` }}>
        <Icon name={ROLE_ICON[user.role]} size={14} color={roleColor} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: roleColor, textTransform: 'uppercase', letterSpacing: '.5px' }}>{user.role}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{user.name}</div>
        </div>
      </div>

      <nav>
        {navItems.map((item) => {
          const count = unreadBySection[item.key] || 0
          return (
            <MotionNavLink
              key={item.key}
              to={item.path}
              data-key={item.key}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="nav-active-pill"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <div className="nav-item-row">
                    <div style={{ width: 17, height: 17, flexShrink: 0 }}>
                      <Icon name={item.icon} size={17} color={isActive ? roleColor : 'var(--text-sec)'} />
                    </div>
                    <span className="nav-label">{item.label}</span>
                    {count > 0 && (
                      <span className="sidebar-notif-badge">{count > 9 ? '9+' : count}</span>
                    )}
                    {isActive && count === 0 && <div className="nav-dot" />}
                  </div>
                </>
              )}
            </MotionNavLink>
          )
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="collapse-btn" onClick={() => setCollapsed((c) => !c)}>
          <Icon name="menu" size={17} color="var(--text-sec)" />
          <span className="nav-label" style={{ fontSize: 12 }}>Collapse</span>
        </div>
        <motion.div
          className="nav-item"
          onClick={logout}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          style={{ marginTop: 6, cursor: 'pointer', background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.25)' }}
        >
          <div className="nav-item-row">
            <div style={{ width: 17, height: 17, flexShrink: 0 }}><Icon name="logout" size={17} color="#fc8181" /></div>
            <span className="nav-label" style={{ color: '#fc8181', fontWeight: 600 }}>Sign Out</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
