// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module avatar-stack
 * Stack of avatars (overlapping) with tooltips; optional max count with "+N" for overflow. Orientation vertical/horizontal.
 * Depends on: UI Avatar, Tooltip, cva, cn.
 * Used by: program cards, collaborators, any multi-user display.
 */
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const avatarStackVariants = cva('flex -space-x-4 -space-y-4', {
  variants: {
    orientation: {
      vertical: 'flex-row',
      horizontal: 'flex-col',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
  },
})

/** @property avatars - List of { name, image } for each avatar. */
/** @property maxAvatarsAmount - Max avatars shown before "+N"; default 3. */
/** @property orientation - vertical (default) or horizontal layout. */
export interface IAvatarStackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarStackVariants> {
  avatars: { name: string; image: string }[]
  maxAvatarsAmount?: number
}

/** Renders overlapping avatars with tooltips and optional "+N" for overflow. */
const AvatarStack = ({
  className,
  orientation,
  avatars,
  maxAvatarsAmount = 3,
  ...props
}: IAvatarStackProps) => {
  const shownAvatars = avatars.slice(0, maxAvatarsAmount)
  const hiddenAvatars = avatars.slice(maxAvatarsAmount)

  return (
    <div
      className={cn(
        avatarStackVariants({ orientation }),
        className,
        orientation === 'horizontal' ? 'space-x-0' : 'space-y-0'
      )}
      {...props}
    >
      {shownAvatars.map(({ name, image }, index) => (
        <Tooltip key={`${name}-${image}-${index}`}>
          <TooltipTrigger asChild>
            <Avatar className="hover:z-20 z-10 size-7 sm:size-8">
              <AvatarImage src={image} alt={name ? `${name} avatar` : "User avatar"} />
              <AvatarFallback>
                {name
                  ?.split(' ')
                  ?.map((word) => word[0])
                  ?.join('')
                  ?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent className="bg-lightSecondary text-white">
            <p>{name}</p>
          </TooltipContent>
        </Tooltip>
      ))}

      {hiddenAvatars.length ? (
        <Tooltip key="hidden-avatars">
          <TooltipTrigger asChild>
            <Avatar className="size-7 sm:size-8 z-10">
              <AvatarFallback>+{avatars.length - shownAvatars.length}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent className="bg-lightSecondary text-white">
            {hiddenAvatars.map(({ name }, index) => (
              <p key={`${name}-${index}`}>{name}</p>
            ))}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}

export { AvatarStack, avatarStackVariants }
