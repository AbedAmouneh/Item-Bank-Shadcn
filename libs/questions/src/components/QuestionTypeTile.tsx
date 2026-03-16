import React from 'react'
import { cn } from '@item-bank/ui'

interface QuestionTypeTileProps {
  label: string
  icon: React.ReactNode
  onClick: () => void
  selected?: boolean
}

export default function QuestionTypeTile({ label, icon, onClick, selected }: QuestionTypeTileProps) {
  return (
    <button
      type="button"
      role="button"
      aria-pressed={selected}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'flex flex-col items-center gap-3 py-5 px-3 rounded-2xl cursor-pointer transition-colors duration-150 select-none',
        'outline-none border-2 focus-visible:border-primary',
        selected
          ? 'border-primary bg-primary/10 dark:bg-primary/20'
          : 'border-transparent hover:bg-primary/[0.06] dark:hover:bg-primary/[0.12]'
      )}
    >
      {/* Icon circle */}
      <div className="w-[72px] h-[72px] rounded-full bg-primary/[0.08] dark:bg-primary/[0.15] flex items-center justify-center text-primary-dark dark:text-primary flex-shrink-0">
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement<{ size?: number; strokeWidth?: number }>, {
              size: 32,
              strokeWidth: 1.5,
            })
          : icon}
      </div>

      <span className="text-[0.8125rem] font-medium leading-[1.35] text-foreground text-center max-w-[100px]">
        {label}
      </span>
    </button>
  )
}
