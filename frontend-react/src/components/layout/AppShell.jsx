import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import NotifPanel from './NotifPanel'
import AccountModal from '../modals/AccountModal'

export default function AppShell({ navItems, title }) {
  const [openPanel, setOpenPanel] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    if (!openPanel) return
    const onClick = (e) => {
      if (e.target.closest('#notif-btn') || e.target.closest('#notif-panel')) return
      if (e.target.closest('#user-menu')) return
      if (e.target.closest('#color-theme-btn')) return
      setOpenPanel(null)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [openPanel])

  // Close the mobile drawer automatically whenever the route changes (e.g.
  // after tapping a nav link), so it doesn't stay open over the new page.
  useEffect(() => { setMobileNavOpen(false) }, [location.pathname])

  return (
    <div id="app">
      <Sidebar navItems={navItems} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            className="sidebar-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={() => setMobileNavOpen(false)}
          />
        )}
      </AnimatePresence>
      <div id="main">
        <Topbar title={title} openPanel={openPanel} setOpenPanel={setOpenPanel} onOpenProfile={() => setProfileOpen(true)} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <NotifPanel open={openPanel === 'notif'} onClose={() => setOpenPanel(null)} />
        {/* Rendered here (not inside Topbar) — #topbar has backdrop-filter, which
            creates a new containing block for position:fixed descendants and
            would trap the modal's overlay inside the topbar's own tiny box
            instead of the full viewport. */}
        <AccountModal open={profileOpen} onClose={() => setProfileOpen(false)} />
        {/* No page-level transition wrapper here on purpose — every routed
            page already animates its own content in (fadeUp on hero cards,
            staggerContainer/listContainer on grids and tables). Wrapping
            Outlet in a second fadeUp used to run that transform+opacity
            animation again, at the same time as the page's own, on every
            single navigation — doubling the compositor work and adding the
            outer exit-then-enter delay on top, which is what made switching
            pages feel sluggish on mobile in particular. */}
        <div id="content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
