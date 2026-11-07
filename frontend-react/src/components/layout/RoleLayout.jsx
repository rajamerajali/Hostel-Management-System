import RequireAuth from '../../auth/RequireAuth'
import AppShell from './AppShell'
import { NotificationsProvider } from '../../contexts/NotificationsContext'

// Shared shell for all 3 role areas (admin/warden/student) — parameterized
// instead of 3 near-duplicate layout files.
export default function RoleLayout({ roles, navItems, title }) {
  return (
    <RequireAuth roles={roles}>
      <NotificationsProvider>
        <AppShell navItems={navItems} title={title} />
      </NotificationsProvider>
    </RequireAuth>
  )
}
