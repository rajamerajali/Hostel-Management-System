export default function Avatar({ initials, color, size = 32 }) {
  return (
    <div
      className="avatar"
      style={{
        width: size, height: size,
        background: `${color}33`, border: `1.5px solid ${color}55`,
        fontSize: size * 0.34, color,
      }}
    >
      {initials}
    </div>
  )
}
