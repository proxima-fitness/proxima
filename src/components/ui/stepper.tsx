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
    <div className="flex items-center">
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            "w-8 h-8 rounded-full border-2 flex items-center justify-center",
            isCompleted
              ? "border-lightSecondary bg-lightSecondary text-white"
              : isActive
                ? "border-primary"
                : "border-muted",
          )}
        >
          {isCompleted ? <Check className="w-4 h-4 bg-lightSecondary text-white" /> : <span className="text-sm font-medium">{title[0]}</span>}
        </div>
      </div>
      <div className="ml-4">
        <p className={cn("text-xs font-medium", isActive || isCompleted ? "text-foreground" : "text-muted-foreground")}>
          {title}
        </p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  )
}

interface IStepperProps {
  steps: Array<{ title: string; description?: string }>
  currentStep: number
  onStepChange?: (step: number) => void
}

export function Stepper({ steps, currentStep }: IStepperProps) {
  return (
    <div className="pt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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

