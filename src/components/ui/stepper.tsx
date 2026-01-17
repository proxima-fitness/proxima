"use client"

import * as React from "react"
import { Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface IStepProps {
  title: string
  description?: string
  isCompleted?: boolean
  isActive?: boolean
}

const Step: React.FC<IStepProps> = ({ title, description, isCompleted, isActive }) => {
  return (
    <div className="flex items-center max-sm:items-start">
      <div className="relative flex items-center justify-center flex-shrink-0">
        <div
          className={cn(
            "w-8 h-8 max-sm:w-5 max-sm:h-5 rounded-full border-2 flex items-center justify-center",
            isCompleted
              ? "border-lightSecondary bg-lightSecondary text-white"
              : isActive
                ? "border-primary"
                : "border-muted",
          )}
        >
          {isCompleted ? <Check className="w-4 h-4 max-sm:w-3 max-sm:h-3 bg-lightSecondary text-white" /> : <span className="text-sm max-sm:text-[10px] font-medium">{title[0]}</span>}
        </div>
      </div>
      <div className="ml-4 max-sm:ml-1.5 max-sm:min-w-0">
        <p className={cn("text-xs max-sm:text-[10px] font-medium max-sm:leading-tight whitespace-nowrap", isActive || isCompleted ? "text-foreground" : "text-muted-foreground")}>
          {title}
        </p>
        {description && <p className="text-xs max-sm:text-[9px] text-muted-foreground max-sm:leading-tight max-sm:whitespace-normal">{description}</p>}
      </div>
    </div>
  )
}

interface IStepperProps {
  steps: Array<{ title: string; description?: string }>
  currentStep: number
  onStepChange?: (step: number) => void
  legend?: React.ReactNode
}

export function Stepper({ steps, currentStep, legend }: IStepperProps) {
  return (
    <div className="pt-4">
      <div className="flex flex-row flex-wrap md:flex-nowrap justify-between items-start md:items-center gap-4 max-sm:gap-2">
        {steps.map((step, index) => (
          <React.Fragment key={step.title}>
            <Step
              title={step.title}
              description={step.description}
              isCompleted={index < currentStep}
              isActive={index === currentStep}
            />
            {index < steps.length - 1 && <ChevronRight className="hidden md:block text-muted-foreground" />}
          </React.Fragment>
        ))}
        {legend && (
          <>
            <ChevronRight className="hidden md:block text-muted-foreground" />
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

