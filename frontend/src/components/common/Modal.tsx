import { useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleEsc])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 flex items-center justify-center animate-fade-in"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        tabIndex={-1}
        className={`relative w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col bg-dark-card border border-gold/30 rounded-2xl shadow-2xl animate-slide-up focus:outline-none my-auto z-10`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0 bg-dark-card/95 backdrop-blur-sm rounded-t-2xl">
            <h3 className="font-heading text-lg sm:text-xl font-bold text-white uppercase tracking-wide truncate pr-2">{title}</h3>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-gold transition-colors p-1 rounded-lg hover:bg-white/5 shrink-0"
              aria-label="Tutup modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Close button without title */}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/60 hover:text-gold transition-colors p-1.5 rounded-lg hover:bg-white/5 z-20"
            aria-label="Tutup modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
