import { AnimatePresence, motion } from 'framer-motion'
import Icon from './Icon'
import { modalOverlay, modalPanel } from '../../utils/motion'

// Generic modal overlay: renders nothing when `open` is false, but exit
// animates first via AnimatePresence instead of hard-unmounting.
// Clicking the dimmed backdrop (not the modal itself) closes it, same as before.
export default function Modal({ open, onClose, title, subtitle, maxWidth = 500, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          variants={modalOverlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div className="modal" variants={modalPanel} initial="hidden" animate="visible" exit="exit" style={{ maxWidth }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: subtitle ? 16 : 20 }}>
              <div>
                <div className="modal-title" style={{ margin: 0 }}>{title}</div>
                {subtitle && <div style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 4 }}>{subtitle}</div>}
              </div>
              <div style={{ cursor: 'pointer' }} onClick={onClose}>
                <Icon name="x" size={18} color="var(--text-sec)" />
              </div>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
