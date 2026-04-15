import React from 'react'

const Card = ({className,children}) => {
  return (
    <div className={`bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export {Card}
