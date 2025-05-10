
import { Badge } from "@/components/ui/badge"
import { ActivityIcon, DumbbellIcon, SkullIcon, TrendingDownIcon } from "lucide-react"

export const SetTypesLegend = () => {
    return (
        <div className="flex flex-row justify-center flex-wrap items-center py-4 sm:pl-8 gap-2 text-xs">
            <div className="font-secondary font-bold">Legend:</div>
            <Badge variant="outline" className="bg-gray-300 border-none text-xs gap-2"><ActivityIcon className="w-4 h-4" /> Warmup Set</Badge>
            <Badge variant="outline" className="text-xs gap-2"><DumbbellIcon className="w-4 h-4" /> Working Set</Badge>
            <Badge variant="outline" className="bg-[#33bbcf] text-white border-none text-xs gap-2"><TrendingDownIcon className="w-4 h-4" /> Drop Set</Badge>
            <Badge variant="outline" className="bg-[#01579B] text-white border-none text-xs gap-2"><SkullIcon className="w-4 h-4" /> Failure Set</Badge>
        </div>
    )
}