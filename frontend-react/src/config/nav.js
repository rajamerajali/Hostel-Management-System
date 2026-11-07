// Paths are absolute (rooted) since Sidebar feeds them straight into
// <NavLink to={item.path}> — a leading "/" always resolves from the router
// root regardless of nesting depth, so each role's paths must include its
// own prefix.
export const ADMIN_NAV = [
  { key: 'dashboard',      icon: 'home',   label: 'Dashboard',       path: '/admin/dashboard' },
  { key: 'students',       icon: 'users',  label: 'Students',        path: '/admin/students' },
  { key: 'wardens',        icon: 'shield', label: 'Wardens / Staff', path: '/admin/wardens' },
  { key: 'rooms',          icon: 'bed',    label: 'Rooms',           path: '/admin/rooms' },
  { key: 'complaints',     icon: 'alert',  label: 'Complaints',      path: '/admin/complaints' },
  { key: 'fees',           icon: 'dollar', label: 'Fees',            path: '/admin/fees' },
  { key: 'announcements',  icon: 'bell',   label: 'Notices',         path: '/admin/announcements' },
  { key: 'room-requests',  icon: 'eye',    label: 'Room Requests',   path: '/admin/room-requests' },
  { key: 'reports',        icon: 'chart',  label: 'Reports',         path: '/admin/reports' },
]

export const WARDEN_NAV = [
  { key: 'dashboard',      icon: 'home',   label: 'Dashboard',     path: '/warden/dashboard' },
  { key: 'room-requests',  icon: 'bed',    label: 'Room Requests', path: '/warden/room-requests' },
  { key: 'complaints',     icon: 'alert',  label: 'Complaints',    path: '/warden/complaints' },
  { key: 'visitors',       icon: 'eye',    label: 'Visitors',      path: '/warden/visitors' },
  { key: 'announcements',  icon: 'bell',   label: 'Notices',       path: '/warden/announcements' },
  { key: 'attendance',     icon: 'check',  label: 'Attendance',    path: '/warden/attendance' },
]

export const STUDENT_NAV = [
  { key: 'dashboard',      icon: 'home',   label: 'My Dashboard', path: '/student/dashboard' },
  { key: 'room',           icon: 'bed',    label: 'My Room',      path: '/student/room' },
  { key: 'complaints',     icon: 'alert',  label: 'Complaints',   path: '/student/complaints' },
  { key: 'fees',           icon: 'dollar', label: 'Fees',         path: '/student/fees' },
  { key: 'attendance',     icon: 'check',  label: 'Attendance',   path: '/student/attendance' },
  { key: 'announcements',  icon: 'bell',   label: 'Notices',      path: '/student/announcements' },
]
