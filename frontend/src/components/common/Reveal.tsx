import React from 'react'
import { useInView } from '../../hooks/useInView'

export type RevealVariant = 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right' | 'scale-in'

interface RevealProps {
  children: React.ReactNode
  variant?: RevealVariant
  delay?: number // in ms
  duration?: number // in ms (default: 600)
  className?: string
  as?: 'div' | 'section' | 'article' | 'span' | 'li'
}

export default function Reveal({
  children,
  variant = 'fade-up',
  delay = 0,
  duration = 600,
  className = '',
  as: Component = 'div',
}: RevealProps) {
  const { ref, isInView } = useInView({ threshold: 0.1, once: true })

  const getVariantStyles = () => {
    switch (variant) {
      case 'fade-up':
        return isInView
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
      case 'slide-left':
        return isInView
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 -translate-x-10'
      case 'slide-right':
        return isInView
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-10'
      case 'scale-in':
        return isInView
          ? 'opacity-100 scale-100'
          : 'opacity-0 scale-95'
      case 'fade-in':
      default:
        return isInView ? 'opacity-100' : 'opacity-0'
    }
  }

  const Tag = Component as any

  return (
    <Tag
      ref={ref}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={`transition-all ${getVariantStyles()} ${className}`}
    >
      {children}
    </Tag>
  )
}
