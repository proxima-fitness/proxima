"use client"

/**
 * @module stepper
 * Horizontal step indicator (circle + label per step, chevrons between).
 * Depends on: @/lib/utils, lucide-react.
 * Used by: onboarding, checkout, wizard flows.
 */
import * as React from "react"
import { Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Single step display.
 * @property isCompleted - Show check icon and completed styling.
 * @property isActive - Current step styling (border-primary).
 */
interface IStepProps {
  title: string
  description?: string
  isCompleted?: boolean
  isActive?: boolean
}

const Step: React.FC<IStepProps> = ({ title, description, isCompleted, isActive }) => {
  return (
    <div className="flex items-center max-sm:items-start">
      <div className="relative flex items-center justify-center shrink-0">
        <div
          className={cn(
            "w-6 h-6 max-sm:w-4 max-sm:h-4 rounded-full border flex items-center justify-center",
            isCompleted
              ? "border-lightSecondary bg-lightSecondary text-white"
              : isActive
                ? "border-primary"
                : "border-muted",
          )}
        >
          {isCompleted ? <Check className="w-3 h-3 max-sm:w-[10px] max-sm:h-[10px] bg-lightSecondary text-white" /> : <span className="text-xs max-sm:text-[9px] font-medium">{title[0]}</span>}
        </div>
      </div>
      <div className="ml-2.5 max-sm:ml-1 max-sm:min-w-0">
        <p className={cn("text-xs max-sm:text-[10px] font-medium max-sm:leading-tight whitespace-nowrap", isActive || isCompleted ? "text-foreground" : "text-muted-foreground")}>
          {title}
        </p>
        {description && <p className="text-[11px] max-sm:text-[8px] text-muted-foreground max-sm:leading-tight max-sm:whitespace-normal">{description}</p>}
      </div>
    </div>
  )
}

/**
 * @property steps - Step definitions (title, optional description).
 * @property currentStep - Zero-based index of active step.
 * @property legend - Optional node (e.g. button) after the step list.
 */
interface IStepperProps {
  steps: Array<{ title: string; description?: string }>
  currentStep: number
  onStepChange?: (step: number) => void
  legend?: React.ReactNode
}

/** Renders steps in a row with chevrons; completed steps show check, current step is highlighted. */
export function Stepper({ steps, currentStep, legend }: IStepperProps) {
  return (
    <div className="pt-2">
      <div className="flex flex-row flex-wrap md:flex-nowrap justify-between items-start md:items-center gap-2 max-sm:gap-1.5">
        {steps.map((step, index) => (
          <React.Fragment key={step.title}>
            <Step
              title={step.title}
              description={step.description}
              isCompleted={index < currentStep}
              isActive={index === currentStep}
            />
            {index < steps.length - 1 && <ChevronRight className="hidden md:block w-4 h-4 text-muted-foreground" />}
          </React.Fragment>
        ))}
        {legend && (
          <>
            <ChevronRight className="hidden md:block w-4 h-4 text-muted-foreground" />
            <div className="flex items-center md:items-center">
              {legend}
            </div>
          </>
        )}
      </div>
      <div className="flex justify-between">
        {/* <Button variant="outline" onClick={() => onStepChange(currentStep - 1)} disabled={currentStep === 0}>
          Previous
        </Button>
        <Button onClick={() => onStepChange(currentStep + 1)} disabled={currentStep === steps.length - 1}>
          {currentStep === steps.length - 1 ? "Finish" : "Next"}
        </Button> */}
      </div>
    </div>
  )
}

