/**
 * @module Filters
 * Commented-out advanced filters form (sex, age, program length, days, goals, equipment, exclude, health, etc.). Kept for reference; not rendered.
 * Depends on: (none – code commented). Used by: none.
 */
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import MultiSelect, { TSelectOption } from "@/components/ui/multi-select"
// import { Input } from "@/components/ui/input"
// import { activityLevelOptions, ageOptions, dayPerWeekOptions, difficultyOptions, equipmentOptions, focusAreasOptions, goalsOptions, healthIssuesOptions, programLengthOptions, sexOptions, specializationOptions, specificDaysOptions, workoutDurationOptions } from "@/assets/constants"
// import { Checkbox } from "@/components/ui/checkbox"
// import { Label } from "@/components/ui/label"

// interface IProps {
//     sex: string;
//     age: string;
//     programLength: ""|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"11"|"12";
//     daysPerWeek: string;
//     excludeAreas: TSelectOption[];
//     excludeEquipment: TSelectOption[];
//     healthIssues: TSelectOption[];
//     specificDays: TSelectOption[];
//     workoutDuration: string;
//     activityLevel: string;
//     goals: TSelectOption[];
//     specialization: TSelectOption[];
//     equipment: TSelectOption[];
//     focusAreas: TSelectOption[];
//     difficultyLevel: TSelectOption[];
//     excludeSpecializations: TSelectOption[];
//     programTitle: string;
//     explore: boolean;
//     handleSex: (value: string) => void;
//     handleAge: (value: string) => void;
//     handleDaysPerWeek: (value: string) => void;
//     handleSpecificDays: (value: TSelectOption[]) => void;
//     handleProgramLength: (value: ""|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"11"|"12") => void;
//     handleWorkoutDuration: (value: string) => void;
//     handleActivityLevel: (value: string) => void;
//     handleGoals: (value: TSelectOption[]) => void;
//     handleSpecialization: (value: TSelectOption[]) => void;
//     handleEquipment: (value: TSelectOption[]) => void;
//     handleFocusAreas: (value: TSelectOption[]) => void;
//     handleDifficultyLevel: (value: TSelectOption[]) => void;
//     handleExcludeAreas: (value: TSelectOption[]) => void;
//     handleExcludeEquipment: (value: TSelectOption[]) => void;
//     handleExcludeSpecializations: (value: TSelectOption[]) => void;
//     handleHealthIssues: (value: TSelectOption[]) => void;
//     handleProgramTitle: (value: string) => void;
//     handleExplore: () => void;
// }

// export const Filters: React.FC<IProps> = (props) => {

//     const { sex, age, specificDays, excludeAreas, excludeEquipment, healthIssues, daysPerWeek, programLength, workoutDuration, activityLevel, goals, specialization, equipment, focusAreas, difficultyLevel, excludeSpecializations, programTitle, explore, handleSex, handleAge, handleDaysPerWeek, handleSpecificDays, handleProgramLength, handleWorkoutDuration, handleActivityLevel, handleGoals, handleSpecialization, handleEquipment, handleFocusAreas, handleDifficultyLevel, handleExcludeAreas, handleExcludeEquipment, handleExcludeSpecializations, handleHealthIssues, handleProgramTitle, handleExplore } = props;

//     return (
//         <div className="mx-auto bg-white dark:bg-extraDarkGray rounded-xl p-4 max-w-3xl overflow-y-auto overflow-x-hidden h-full w-full ">

//         <div className="flex flex-row justify-between py-4 items-start">

//             <Input
//                 type="text"
//                 id="title"
//                 placeholder="Program Title"
//                 className="w-full h-10"
//                 value={ programTitle }
//                 onChange={ (event) => handleProgramTitle(event.target.value) }
//             />

//             {/* <span className="flex flex-row max-sm:flex-col max-sm:items-end gap-2">
//                 <Link
//                     ref={ submitRef }
//                     target="_self"
//                     rel="noopener noreferrer"
//                     className="max-sm:w-full w-full h-10"
//                     href={ `/program-builder/build-program?${handleDefineQueryParams()}&edit=true` }
//                 >
//                     <Button className="w-32 bg-black hover:bg-black/80 max-sm:w-full h-10 font-bold text-white">
//                     <SparklesIcon className="size-4" />
//                     Build
//                     </Button>
//                 </Link>
//             </span> */}
//         </div>
//         <span className="font-bold py-2 flex justify-center">
//             Advanced Filters
//         </span>
//         <span className="flex flex-col justify-between gap-5 max-sm:gap-2">
//             <span className="grid grid-cols-2 max-sm:grid-cols-1 max-sm:basis-1/2 max-sm:gap-2 max-sm:pr-2 gap-5 sm:grow-2 basis-2/3 pr-4">
//                 <Select value={ sex } onValueChange={ (value) => handleSex(value) }>
//                     <SelectTrigger className="h-10 bg-white dark:bg-darkGray">
//                         <SelectValue placeholder="Sex" />
//                     </SelectTrigger>
//                     <SelectContent>
//                         { sexOptions.map((sx) => (
//                             <SelectItem key={ sx.value } value={ sx.value }>{ sx.label }</SelectItem>

//                         ))}
//                     </SelectContent>
//                 </Select>
//                 <Select value={ age } onValueChange={ (value) => handleAge(value) }>
//                     <SelectTrigger className="h-10 bg-white dark:bg-darkGray">
//                         <SelectValue placeholder="Age" />
//                     </SelectTrigger>
//                     <SelectContent>
//                         { ageOptions.map((age) => (
//                             <SelectItem key={ age.value } value={ age.value }>{ age.label }</SelectItem>
//                         ))}
//                     </SelectContent>
//                 </Select>
//                 <Select
//                     value={ programLength }
//                     onValueChange={ (value) => {
//                         // Enforce max 12 weeks (program length in weeks)
//                         if (value === "") {
//                             handleProgramLength("");
//                             return;
//                         }
//                         const num = parseInt(value, 10);
//                         const clamped = (isNaN(num) || num < 1 ? "1" : num > 12 ? "12" : String(num)) as "1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"11"|"12";
//                         handleProgramLength(clamped);
//                     } }
//                 >
//                     <SelectTrigger className="h-10 bg-white dark:bg-darkGray">
//                         <SelectValue placeholder="Program length" />
//                     </SelectTrigger>
//                     <SelectContent>
//                         { programLengthOptions.map((length) => (
//                             <SelectItem key={ length.value } value={ length.value }>{ length.label }</SelectItem>
//                         ))}
//                     </SelectContent>
//                 </Select>
//                 <Select value={ daysPerWeek } onValueChange={ (value) => handleDaysPerWeek(value) }>
//                     <SelectTrigger className="h-10 bg-white dark:bg-darkGray">
//                         <SelectValue placeholder="How many days per week?" />
//                     </SelectTrigger>
//                     <SelectContent>
//                         { dayPerWeekOptions.map((days) => (
//                             <SelectItem key={ days.value } value={ days.value }>{ days.label }</SelectItem>
//                         ))}
//                     </SelectContent>
//                 </Select>
//                 <MultiSelect
//                     value={ specificDays }
//                     onChange={ (value) => handleSpecificDays(value) }
//                     badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
//                     className="bg-white dark:bg-darkGray"
//                     defaultOptions={ specificDaysOptions }
//                     placeholder="Specific days"
//                     emptyIndicator={ (
//                         <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
//                             no results found.
//                         </p>
//                 ) }
//                 />
//                 <Select value={ workoutDuration } onValueChange={ (value) => handleWorkoutDuration(value) }>
//                     <SelectTrigger className="h-10 bg-white dark:bg-darkGray">
//                         <SelectValue placeholder="Workout duration" />
//                     </SelectTrigger>
//                     <SelectContent>
//                         { workoutDurationOptions.map((duration) => (
//                             <SelectItem key={ duration.value } value={ duration.value }>{ duration.label }</SelectItem>
//                         ))}
//                     </SelectContent>
//                 </Select>
//                 <Select value={ activityLevel } onValueChange={ (value) => handleActivityLevel(value) }>
//                     <SelectTrigger className="h-10 bg-white dark:bg-darkGray">
//                         <SelectValue placeholder="Activity level" />
//                     </SelectTrigger>
//                     <SelectContent>
//                         { activityLevelOptions.map((act) => (
//                             <SelectItem key={ act.value } value={ act.value }>{ act.label }</SelectItem>
//                         ))}
//                     </SelectContent>
//                 </Select>
//                 <MultiSelect
//                     value={ goals }
//                     onChange={ (value) => handleGoals(value) }
//                     badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
//                     className="bg-white dark:bg-darkGray"
//                     defaultOptions={ goalsOptions }
//                     placeholder="Goals"
//                     emptyIndicator={ (
//                         <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
//                             no results found.
//                         </p>
//                 ) }
//                 />
//                 <MultiSelect
//                     value={ specialization }
//                     onChange={ (value) => handleSpecialization(value) }
//                     badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
//                     className="bg-white dark:bg-darkGray"
//                     defaultOptions={ specializationOptions }
//                     placeholder="Specialization"
//                     emptyIndicator={ (
//                         <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
//                             no results found.
//                         </p>
//                 ) }
//                 />
//                 <MultiSelect
//                     value = { equipment }
//                     onChange={ (value) => handleEquipment(value) }
//                     badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
//                     className="bg-white dark:bg-darkGray"
//                     defaultOptions={ equipmentOptions }
//                     placeholder="Equipment"
//                     emptyIndicator={ (
//                         <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
//                             no results found.
//                         </p>
//                 ) }
//                 />
//                 <MultiSelect
//                     value = { focusAreas }
//                     onChange={ (value) => handleFocusAreas(value) }
//                     badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
//                     className="bg-white dark:bg-darkGray"
//                     defaultOptions={ focusAreasOptions }
//                     placeholder="Focus areas"
//                     emptyIndicator={ (
//                         <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
//                             no results found.
//                         </p>
//                 ) }
//                 />
//                 <MultiSelect
//                     value = { difficultyLevel }
//                     onChange={ (value) => handleDifficultyLevel(value) }
//                     badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
//                     className="bg-white dark:bg-darkGray"
//                     defaultOptions={ difficultyOptions }
//                     placeholder="Difficulty"
//                     emptyIndicator={ (
//                         <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
//                             no results found.
//                         </p>
//                 ) }
//                 />
//             </span>
//             <span className="font-bold py-2 flex justify-center">
//                     Exclude
//             </span>
//             <span className="grid grid-cols-1 grow basis-1/3 gap-4">
//                 <MultiSelect
//                     value = { excludeAreas }
//                     onChange={ (value) => handleExcludeAreas(value) }
//                     badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
//                     className="bg-white dark:bg-darkGray"
//                     defaultOptions={ focusAreasOptions }
//                     placeholder="Exclude focus areas"
//                     emptyIndicator={ (
//                         <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
//                             no results found.
//                         </p>
//                 ) }
//                 />
//                 <MultiSelect
//                     value = { excludeEquipment }
//                     onChange={ (value) => handleExcludeEquipment(value) }
//                     badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
//                     className="bg-white dark:bg-darkGray"
//                     defaultOptions={ equipmentOptions }
//                     placeholder="Exclude equipment"
//                     emptyIndicator={ (
//                         <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
//                             no results found.
//                         </p>
//                 ) }
//                 />
//                 <MultiSelect
//                     value = { excludeSpecializations }
//                     onChange={ (value) => handleExcludeSpecializations(value) }
//                     badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
//                     className="bg-white dark:bg-darkGray"
//                     defaultOptions={ specializationOptions }
//                     placeholder="Exclude specializations"
//                     emptyIndicator={ (
//                         <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
//                             no results found.
//                         </p>
//                 ) }
//                 />
//                 <MultiSelect
//                     value = { healthIssues }
//                     onChange={ (value) => handleHealthIssues(value) }
//                     badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
//                     className="bg-white dark:bg-darkGray"
//                     defaultOptions={ healthIssuesOptions }
//                     placeholder="Health issues"
//                     emptyIndicator={ (
//                         <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
//                             no results found.
//                         </p>
//                 ) }
//                 />
//             </span>
//         </span>
//         <span className="flex flex-row justify-between items-center py-4">
//             <span className="flex flex-col gap-2 grow basis-0 w-0">
//                 <span className="w-full flex flex-row items-end justify-start gap-2">
//                 <Checkbox checked={ explore } onCheckedChange={ handleExplore } className="w-4 h-4 data-[state=checked]:bg-[#33bbcf] bg-offWhite data-[state=checked]:text-white" id="explore" />
//                 <Label className="text-xs text-gray-600">Share program with community</Label>
//                 </span>
//             </span>
//         </span>

//         </div>
//     );

// };
