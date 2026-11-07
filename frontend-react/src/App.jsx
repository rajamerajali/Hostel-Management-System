import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import RoleLayout from './components/layout/RoleLayout'
import Login from './pages/Login'
import { ADMIN_NAV, WARDEN_NAV, STUDENT_NAV } from './config/nav'

import AdminDashboard from './features/admin/Dashboard'
import Students from './features/admin/Students'
import Wardens from './features/admin/Wardens'
import AdminRooms from './features/admin/Rooms'
import AdminComplaints from './features/admin/Complaints'
import Fees from './features/admin/Fees'
import AdminAnnouncements from './features/admin/Announcements'
import AdminRoomRequests from './features/admin/RoomRequests'
import Reports from './features/admin/Reports'

import WardenDashboard from './features/warden/Dashboard'
import WardenRoomRequests from './features/warden/RoomRequests'
import WardenComplaints from './features/warden/Complaints'
import Visitors from './features/warden/Visitors'
import WardenAnnouncements from './features/warden/Announcements'
import WardenAttendance from './features/warden/Attendance'

import StudentDashboard from './features/student/Dashboard'
import StudentRoom from './features/student/Room'
import StudentComplaints from './features/student/Complaints'
import StudentFees from './features/student/Fees'
import StudentAttendance from './features/student/Attendance'
import StudentAnnouncements from './features/student/Announcements'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/admin" element={<RoleLayout roles={['admin']} navItems={ADMIN_NAV} title="Admin Dashboard" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="wardens" element={<Wardens />} />
          <Route path="rooms" element={<AdminRooms />} />
          <Route path="complaints" element={<AdminComplaints />} />
          <Route path="fees" element={<Fees />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="room-requests" element={<AdminRoomRequests />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        <Route path="/warden" element={<RoleLayout roles={['warden', 'admin']} navItems={WARDEN_NAV} title="Warden Dashboard" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<WardenDashboard />} />
          <Route path="room-requests" element={<WardenRoomRequests />} />
          <Route path="complaints" element={<WardenComplaints />} />
          <Route path="visitors" element={<Visitors />} />
          <Route path="announcements" element={<WardenAnnouncements />} />
          <Route path="attendance" element={<WardenAttendance />} />
        </Route>

        <Route path="/student" element={<RoleLayout roles={['student']} navItems={STUDENT_NAV} title="Student Dashboard" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="room" element={<StudentRoom />} />
          <Route path="complaints" element={<StudentComplaints />} />
          <Route path="fees" element={<StudentFees />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="announcements" element={<StudentAnnouncements />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
