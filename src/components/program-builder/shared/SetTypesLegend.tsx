"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { ActivityIcon, DumbbellIcon, SkullIcon, TrendingDownIcon, InfoIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export const SetTypesLegend = () => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="relative inline-block pt-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Button variant="outline" size="sm" className="flex items-center gap-2 font-secondary font-bold">
        <InfoIcon className="w-4 h-4" />
        Legend
      </Button>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 top-full mt-2 p-3 bg-background border rounded-lg shadow-lg flex flex-col gap-2 min-w-[220px]"
          >
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
              <Badge variant="outline" className="bg-gray-300 border-none text-xs gap-2 w-full justify-start">
                <ActivityIcon className="w-4 h-4" /> Warmup Set
              </Badge>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <Badge variant="outline" className="text-xs gap-2 w-full justify-start">
                <DumbbellIcon className="w-4 h-4" /> Working Set
              </Badge>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <Badge
                variant="outline"
                className="bg-[#33bbcf] text-white border-none text-xs gap-2 w-full justify-start"
              >
                <TrendingDownIcon className="w-4 h-4" /> Drop Set
              </Badge>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
              <Badge
                variant="outline"
                className="bg-[#01579B] text-white border-none text-xs gap-2 w-full justify-start"
              >
                <SkullIcon className="w-4 h-4" /> Failure Set
              </Badge>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
