"use client"

import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ui/message"
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    ArrowRightIcon,
  ArrowUp,
  ChevronDownIcon,
  ChevronUpIcon,
  Copy,
  InfoIcon,
  Pencil,
  ThumbsDown,
  ThumbsUp,
  Trash,
} from "lucide-react"
import { useState } from "react"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ui/reasoning"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { activityLevelOptions, ageOptions, dayPerWeekOptions, difficultyOptions, equipmentOptions, focusAreasOptions, goalsOptions, healthIssuesOptions, programLengthOptions, sexOptions, specializationOptions, specificDaysOptions, workoutDurationOptions } from "@/assets/constants"
import MultiSelect, { IOption } from "@/components/ui/multi-select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"



interface IProps {
    sex: string;
    setSex: (sex: string) => void;
    age: string;
    setAge: (age: string) => void;
    daysPerWeek: string;
    setDaysPerWeek: (daysPerWeek: string) => void;
    specificDays: IOption[];
    setSpecificDays: (specificDays: IOption[]) => void;
    programLength: string;
    setProgramLength: (programLength: string) => void;
    workoutDuration: string;
    setWorkoutDuration: (workoutDuration: string) => void;
    activityLevel: string;
    setActivityLevel: (activityLevel: string) => void;
    goals: IOption[];
    setGoals: (goals: IOption[]) => void;
    specialization: IOption[];
    setSpecialization: (specialization: IOption[]) => void;
    equipment: IOption[];
    setEquipment: (equipment: IOption[]) => void;
    focusAreas: IOption[];
    setFocusAreas: (focusAreas: IOption[]) => void;
    difficultyLevel: IOption[];
    setDifficultyLevel: (difficultyLevel: IOption[]) => void;
    excludeAreas: IOption[];
    setExcludeAreas: (excludeAreas: IOption[]) => void;
    excludeEquipment: IOption[];
    setExcludeEquipment: (excludeEquipment: IOption[]) => void;
    excludeSpecializations: IOption[];
    setExcludeSpecializations: (excludeSpecializations: IOption[]) => void;
    healthIssues: IOption[];
    setHealthIssues: (healthIssues: IOption[]) => void;
    workoutSchema: string;
    setWorkoutSchema: (workoutSchema: string) => void;
    submitRef: React.RefObject<HTMLAnchorElement>;
    search: string;
    chatMessages: TMessage[];
    isLoading: boolean;
    isStreaming: boolean;
    reasoningText: string;
    toggleAdvancedSettingsOpen: () => void;
    advancedSettingsOpen: boolean;
    explore: boolean;
    toggleExplore: () => void;
    programTitle: string;
    setProgramTitle: (programTitle: string) => void;
    handleDefineQueryParams: () => string;
    setSearch: (search: string) => void;
}

function ConversationPromptInput( props: IProps) {

    const {
        search,
        chatMessages,
        isLoading,
        isStreaming,
        reasoningText,
        sex,
        age,
        daysPerWeek,
        specificDays,
        programLength,
        workoutDuration,
        activityLevel,
        goals,
        specialization,
        equipment,
        focusAreas,
        difficultyLevel,
        excludeAreas,
        excludeEquipment,
        excludeSpecializations,
        healthIssues,
        workoutSchema,
        setSex,
        setAge,
        setDaysPerWeek,
        setSpecificDays,
        setProgramLength,
        setWorkoutDuration,
        setActivityLevel,
        setGoals,
        setSpecialization,
        setEquipment,
        setFocusAreas,
        setDifficultyLevel,
        setExcludeAreas,
        setExcludeEquipment,
        setExcludeSpecializations,
        setHealthIssues,
        setWorkoutSchema,
        toggleAdvancedSettingsOpen,
        advancedSettingsOpen,
        explore,
        toggleExplore,
        programTitle,
        setProgramTitle,
        handleDefineQueryParams,
        submitRef } = props;
  const [prompt, setPrompt] = useState(search)


  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ChatContainerRoot className="relative flex-1 space-y-0 overflow-y-auto pt-8">
        <ChatContainerContent className="space-y-12 max-sm:px-4">
          {chatMessages.map((message, index) => {
            const isAssistant = message.role === "assistant"
            const isLastMessage = index === chatMessages.length - 1

            return (
              <Message
                key={message.id}
                className={cn(
                  "mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 md:px-6",
                  isAssistant ? "items-start" : "items-end"
                )}
              >
                {isAssistant ? (
                  <div className="group flex w-full flex-col gap-0">
                    <MessageContent
                      className="text-foreground prose w-full flex-1 rounded-lg bg-transparent p-0"
                      markdown
                    >
                      {message.content}
                    </MessageContent>
                    <MessageActions
                      className={cn(
                        "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                        isLastMessage && "opacity-100"
                      )}
                    >
                      <MessageAction tooltip="Edit" delayDuration={100}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                        >
                          <Copy />
                        </Button>
                      </MessageAction>
                      <MessageAction tooltip="Upvote" delayDuration={100}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                        >
                          <ThumbsUp />
                        </Button>
                      </MessageAction>
                      <MessageAction tooltip="Downvote" delayDuration={100}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                        >
                          <ThumbsDown />
                        </Button>
                      </MessageAction>
                    </MessageActions>
                  </div>
                ) : (
                  <div className="group flex flex-col items-end gap-1">
                    <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
                      {message.content}
                    </MessageContent>
                    <MessageActions
                      className={cn(
                        "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                      )}
                    >
                      <MessageAction tooltip="Edit" delayDuration={100}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                        >
                          <Pencil />
                        </Button>
                      </MessageAction>
                      <MessageAction tooltip="Delete" delayDuration={100}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                        >
                          <Trash />
                        </Button>
                      </MessageAction>
                      <MessageAction tooltip="Copy" delayDuration={100}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                        >
                          <Copy />
                        </Button>
                      </MessageAction>
                    </MessageActions>
                  </div>
                )}
              </Message>
            )
          })}
          {/* Render streamed reasoning at the bottom if present */}
          {(isStreaming || reasoningText) && (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 md:px-6">
              <Reasoning isStreaming={isStreaming}>
                <ReasoningTrigger>Proxima is thinking...</ReasoningTrigger>
                <ReasoningContent className="ml-2 border-l-2 border-l-slate-200 px-2 pb-1 dark:border-l-slate-700">
                  {reasoningText}
                </ReasoningContent>
              </Reasoning>
            </div>
          )}

          { !isStreaming && reasoningText &&
             <div className="mx-auto border-2 border-lightGray rounded-xl p-4 max-w-3xl overflow-x-hidden w-full max-sm:max-h-[90%]">

             <div className="flex flex-row justify-between items-start">
                <div>
                    <Input
                        type="text"
                        id="title"
                        placeholder="Program Title"
                        className="w-full h-10"
                        value={ programTitle }
                        onChange={ (event) => setProgramTitle(event.target.value) }
                    />
                    <span className="text-lightSecondary text-sm flex flex-row gap-2 items-center justify-start pt-2">
                     <InfoIcon />
                     Recommended: Use advanced settings for best experience
                 </span>
                </div>
                 <span className="flex flex-row max-sm:flex-col max-sm:items-end gap-2">
                     <Link
                         ref={ submitRef }
                         target="_self"
                         rel="noopener noreferrer"
                         className="max-sm:w-full h-10"
                         href={ `/program-builder/build-program?${handleDefineQueryParams()}&edit=true` }
                     >
                         <Button className="w-[auto] max-sm:w-full h-10 font-bold bg-[#33bbcf] text-white">
                             <ArrowRightIcon /> Continue
                         </Button>
                     </Link>
                 </span>
             </div>
             <div className="flex flex-row justify-between items-center">
                 <span className="w-[66%]">
                     <Button onClick={ () => toggleAdvancedSettingsOpen() } variant="ghost" className="w-[auto] h-[auto]">
                         Advanced settings { advancedSettingsOpen ? <ChevronUpIcon /> : <ChevronDownIcon /> }
                     </Button>
                 </span>
                 { advancedSettingsOpen &&
                     <span className="font-bold w-[33%] flex justify-center">
                         Exclude
                     </span>
                 }
             </div>
             { advancedSettingsOpen &&
                 <span className="flex flex-row justify-between gap-5 max-sm:gap-2">
                     <span className="grid grid-cols-2 max-sm:grid-cols-1 max-sm:basis-1/2 max-sm:gap-2 max-sm:pr-2 gap-5 sm:flex-grow-[2] basis-2/3 pr-4 border-r-2">
                         <Select value={ sex } onValueChange={ (value) => setSex(value) }>
                             <SelectTrigger className="h-10">
                                 <SelectValue placeholder="Sex" />
                             </SelectTrigger>
                             <SelectContent>
                                 { sexOptions.map((sx) => (
                                     <SelectItem key={ sx.value } value={ sx.value }>{ sx.label }</SelectItem>

                                 ))}
                             </SelectContent>
                         </Select>
                         <Select value={ age } onValueChange={ (value) => setAge(value) }>
                             <SelectTrigger className="h-10">
                                 <SelectValue placeholder="Age" />
                             </SelectTrigger>
                             <SelectContent>
                                 { ageOptions.map((age) => (
                                     <SelectItem key={ age.value } value={ age.value }>{ age.label }</SelectItem>
                                 ))}
                             </SelectContent>
                         </Select>
                         <Select value={ programLength } onValueChange={ (value) => setProgramLength(value) }>
                             <SelectTrigger className="h-10">
                                 <SelectValue placeholder="Program length" />
                             </SelectTrigger>
                             <SelectContent>
                                 { programLengthOptions.map((length) => (
                                     <SelectItem key={ length.value } value={ length.value }>{ length.label }</SelectItem>
                                 ))}
                             </SelectContent>
                         </Select>
                         <Select value={ daysPerWeek } onValueChange={ (value) => setDaysPerWeek(value) }>
                             <SelectTrigger className="h-10">
                                 <SelectValue placeholder="How many days per week?" />
                             </SelectTrigger>
                             <SelectContent>
                                 { dayPerWeekOptions.map((days) => (
                                     <SelectItem key={ days.value } value={ days.value }>{ days.label }</SelectItem>
                                 ))}
                             </SelectContent>
                         </Select>
                         <MultiSelect
                             value={ specificDays }
                             onChange={ (value) => setSpecificDays(value) }
                             badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                             defaultOptions={ specificDaysOptions }
                             placeholder="Select specific days"
                             emptyIndicator={ (
                                 <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                     no results found.
                                 </p>
                         ) }
                         />
                         <Select value={ workoutDuration } onValueChange={ (value) => setWorkoutDuration(value) }>
                             <SelectTrigger className="h-10">
                                 <SelectValue placeholder="Workout duration" />
                             </SelectTrigger>
                             <SelectContent>
                                 { workoutDurationOptions.map((duration) => (
                                     <SelectItem key={ duration.value } value={ duration.value }>{ duration.label }</SelectItem>
                                 ))}
                             </SelectContent>
                         </Select>
                         <Select value={ activityLevel } onValueChange={ (value) => setActivityLevel(value) }>
                             <SelectTrigger className="h-10">
                                 <SelectValue placeholder="Activity level" />
                             </SelectTrigger>
                             <SelectContent>
                                 { activityLevelOptions.map((act) => (
                                     <SelectItem key={ act.value } value={ act.value }>{ act.label }</SelectItem>
                                 ))}
                             </SelectContent>
                         </Select>
                         <MultiSelect
                             value={ goals }
                             onChange={ (value) => setGoals(value) }
                             badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                             defaultOptions={ goalsOptions }
                             placeholder="Goals"
                             emptyIndicator={ (
                                 <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                     no results found.
                                 </p>
                         ) }
                         />
                         <MultiSelect
                             value={ specialization }
                             onChange={ (value) => setSpecialization(value) }
                             badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                             defaultOptions={ specializationOptions }
                             placeholder="Specialization"
                             emptyIndicator={ (
                                 <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                     no results found.
                                 </p>
                         ) }
                         />
                         <MultiSelect
                             value = { equipment }
                             onChange={ (value) => setEquipment(value) }
                             badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                             defaultOptions={ equipmentOptions }
                             placeholder="Equipment"
                             emptyIndicator={ (
                                 <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                     no results found.
                                 </p>
                         ) }
                         />
                         <MultiSelect
                             value = { focusAreas }
                             onChange={ (value) => setFocusAreas(value) }
                             badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                             defaultOptions={ focusAreasOptions }
                             placeholder="Focus areas"
                             emptyIndicator={ (
                                 <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                     no results found.
                                 </p>
                         ) }
                         />
                         <MultiSelect
                             value = { difficultyLevel }
                             onChange={ (value) => setDifficultyLevel(value) }
                             badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                             defaultOptions={ difficultyOptions }
                             placeholder="Difficulty"
                             emptyIndicator={ (
                                 <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                     no results found.
                                 </p>
                         ) }
                         />
                     </span>
                     <span className="grid grid-cols-1 flex-grow basis-1/3 ">
                         <MultiSelect
                             value = { excludeAreas }
                             onChange={ (value) => setExcludeAreas(value) }
                             badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                             defaultOptions={ focusAreasOptions }
                             placeholder="Exclude focus areas"
                             emptyIndicator={ (
                                 <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                     no results found.
                                 </p>
                         ) }
                         />
                         <MultiSelect
                             value = { excludeEquipment }
                             onChange={ (value) => setExcludeEquipment(value) }
                             badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                             defaultOptions={ equipmentOptions }
                             placeholder="Exclude equipment"
                             emptyIndicator={ (
                                 <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                     no results found.
                                 </p>
                         ) }
                         />
                         <MultiSelect
                             value = { excludeSpecializations }
                             onChange={ (value) => setExcludeSpecializations(value) }
                             badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                             defaultOptions={ specializationOptions }
                             placeholder="Exclude specializations"
                             emptyIndicator={ (
                                 <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                     no results found.
                                 </p>
                         ) }
                         />
                         <MultiSelect
                             value = { healthIssues }
                             onChange={ (value) => setHealthIssues(value) }
                             badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                             defaultOptions={ healthIssuesOptions }
                             placeholder="Health issues"
                             emptyIndicator={ (
                                 <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                     no results found.
                                 </p>
                         ) }
                         />
                     </span>
                 </span>
             }
             <span className="flex flex-row justify-between items-center">
                 <span className="flex flex-col gap-2 grow basis-0 w-0">
                     <span className="w-full flex flex-row items-end justify-start gap-2">
                     <Checkbox checked={ explore } onCheckedChange={ toggleExplore } className="w-4 h-4 data-[state=checked]:bg-[#33bbcf] data-[state=checked]:text-white" id="explore" />
                     <Label className="text-xs text-gray-600">Share program with community</Label>
                     </span>
                 </span>
                 <Select onValueChange={(value) => setWorkoutSchema(value)} value={workoutSchema}>
                     <SelectTrigger className="h-10 w-[180px]">
                     <SelectValue placeholder="Workout Schema" />
                     </SelectTrigger>
                     <SelectContent>
                     <SelectItem value="hevy">Hevy Routines</SelectItem>
                     <SelectItem value="proxima">Proxima Program</SelectItem>
                     </SelectContent>
                 </Select>
             </span>

         </div>

          }
        </ChatContainerContent>
      </ChatContainerRoot>
      <div className="inset-x-0 bottom-0 mx-auto w-full max-w-3xl shrink-0 px-3 pb-3 md:px-5 md:pb-5">
        <PromptInput
          isLoading={isLoading}
          value={prompt}
          onValueChange={setPrompt}
        //   onSubmit={handleSubmit}
          className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
        >
          <div className="flex flex-col">
            <PromptInputTextarea
              placeholder="Ask a follow-up..."
              className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
            />

            <PromptInputActions className="mt-5 flex w-full items-center justify-end gap-2 px-3 pb-3">
                <Button
                  size="icon"
                  disabled={!prompt.trim() || isLoading}
                //   onClick={handleSubmit}
                  className="size-9 rounded-full bg-lightSecondary text-white"
                >
                  {!isLoading ? (
                    <ArrowUp size={18} />
                  ) : (
                    <span className="size-3 rounded-xs bg-white" />
                  )}
                </Button>
            </PromptInputActions>
          </div>
        </PromptInput>
      </div>
    </div>
  )
}

export { ConversationPromptInput }
