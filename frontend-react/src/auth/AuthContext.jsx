import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('hostel_user') || 'null')
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser)

  // Called by the Login page after a successful /auth/login or /auth/register response.
  const login = useCallback((token, user) => {
    localStorage.setItem('hostel_token', token)
    localStorage.setItem('hostel_user', JSON.stringify(user))
    setUser(user)
  }, [])

  // Only clears state — does NOT navigate (AuthProvider sits outside the
  // Router in main.jsx, so useNavigate() isn't available here). RequireAuth
  // re-renders when `user` becomes null and redirects to "/" on its own.
  const logout = useCallback(() => {
    localStorage.removeItem('hostel_token')
    localStorage.removeItem('hostel_user')
    setUser(null)
  }, [])

  // Merges a partial patch (e.g. after a profile edit) into the stored user
  // so the sidebar/topbar reflect the change without requiring a re-login.
  const updateUser = useCallback((patch) => {
    setUser((u) => {
      const next = { ...u, ...patch }
      localStorage.setItem('hostel_user', JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, token: localStorage.getItem('hostel_token'), login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
