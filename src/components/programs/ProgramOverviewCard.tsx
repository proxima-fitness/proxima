import { Card } from "../ui/card";
import { ExpandableText } from "../ui/ExpandableText";

/*
 * @module ProgramOverviewCard
 * @description Read-only summary card showing key attributes of a program such as length, description, duration, equipment, specialization, and difficulty.
 * @dependsOn Shared card UI component and the `TProgramPage` data model for program metadata.
 * @usedBy Program detail layouts to provide a structured overview of what a program entails.
 */

/**
 * Props for `ProgramOverviewCard`.
 * @property program Program page data whose first schedule/program entry is used to derive overview fields.
 */
interface IProps {
    program: TProgramPage;
}

const rowDivider =
    "border-b border-black/5 pb-4 dark:border-white/10 sm:flex-row sm:items-start sm:gap-6";

const labelClass =
    "text-sm font-medium text-muted-foreground sm:w-[min(28%,11rem)] sm:shrink-0";

const valueClass = "text-sm text-foreground sm:min-w-0 sm:flex-1";

/**
 * ProgramOverviewCard renders labeled rows summarizing the main properties of the selected program.
 */
export const ProgramOverviewCard: React.FC<IProps> = (props) => {

    const {
        program,
    } = props;

    const p0 = program?.program?.[0];
    const equipmentDisplay =
        p0?.equipment && p0.equipment.length > 0 ? p0.equipment : "n/a";

    return (
        <Card className="rounded-2xl border-0 bg-card/80 p-6 shadow-none backdrop-blur-sm dark:border dark:border-white/10 dark:bg-card/60 sm:p-8">
            <h2 className="font-third text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Details
            </h2>
            <dl className="mt-6 flex flex-col gap-0">
                <div className={`flex flex-col gap-1 pt-0 ${rowDivider}`}>
                    <dt className={labelClass}>Program length</dt>
                    <dd className={valueClass}>
                        { p0?.program_length ? `${p0.program_length} weeks` : "# Weeks"}
                    </dd>
                </div>
                <div className={`flex flex-col gap-1 pt-4 ${rowDivider}`}>
                    <dt className={labelClass}>Description</dt>
                    <dd className={valueClass}>
                        { (p0?.details && p0.details.length > 0)
                            ? <ExpandableText text={p0.details} maxLines={3} />
                            : "n/a" }
                    </dd>
                </div>
                <div className={`flex flex-col gap-1 pt-4 ${rowDivider}`}>
                    <dt className={labelClass}>Workout duration</dt>
                    <dd className={valueClass}>
                        { p0?.workout_duration ? `${p0.workout_duration} mins` : "n/a"}
                    </dd>
                </div>
                <div className={`flex flex-col gap-1 pt-4 ${rowDivider}`}>
                    <dt className={labelClass}>Equipment</dt>
                    <dd className={valueClass}>
                        { equipmentDisplay }
                    </dd>
                </div>
                <div className={`flex flex-col gap-1 pt-4 ${rowDivider}`}>
                    <dt className={labelClass}>Specialization</dt>
                    <dd className={valueClass}>
                        { (p0?.specialization && p0.specialization.length > 0)
                            ? p0.specialization.map((spec) => spec).join(", ")
                            : "n/a"}
                    </dd>
                </div>
                <div className="flex flex-col gap-1 pt-4 sm:flex-row sm:items-start sm:gap-6">
                    <dt className={labelClass}>Difficulty</dt>
                    <dd className={valueClass}>
                        { (p0?.difficulty && p0.difficulty.length > 0)
                            ? p0.difficulty.map((diff) => diff).join(", ")
                            : "n/a"}
                    </dd>
                </div>
            </dl>
        </Card>
    );
};
