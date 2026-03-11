import * as React from "react"
import { cn } from "../../lib/utils"

interface TabProps {
  label: string
  value: string
}

interface TabsProps {
  tabs: TabProps[]
  active: string
  onChange: (value: string) => void
}

export const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange }) => {
  return (
    <div className="flex border-b">
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "px-4 py-2 text-sm font-medium",
            active === tab.value
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-blue-600"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
