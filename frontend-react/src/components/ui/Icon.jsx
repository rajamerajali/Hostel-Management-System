import { ICONS } from './icons'

export default function Icon({ name, size = 16, color = 'currentColor', style }) {
  return (
    <div
      style={{
        width: size, height: size, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        color, ...style,
      }}
      dangerouslySetInnerHTML={{ __html: ICONS[name] || '' }}
    />
  )
}
