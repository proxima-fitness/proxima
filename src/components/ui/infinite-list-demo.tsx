'use client'

/**
 * @module infinite-list-demo
 * Infinite-scroll list backed by Supabase: fetches pages via useInfiniteQuery and
 * loads more when sentinel intersects the scroll container.
 * Depends on: @/lib/utils, @/hooks/use-infinite-query.
 * Used by: app and feature components that list paginated Supabase data.
 */

import { cn } from '@/lib/utils'
import {
  TSupabaseQueryHandler,
  TSupabaseTableData,
  TSupabaseTableName,
  useInfiniteQuery,
} from '@/hooks/use-infinite-query'
import * as React from 'react'

/**
 * @param tableName - Supabase table to query.
 * @param columns - Select columns (default '*').
 * @param pageSize - Page size for pagination.
 * @param trailingQuery - Optional query filter/order.
 * @param renderItem - Renders each row.
 * @param renderNoResults - Shown when list is empty.
 * @param renderSkeleton - Shown while loading (receives count).
 */
interface IInfiniteListProps<TableName extends TSupabaseTableName> {
  tableName: TableName
  columns?: string
  pageSize?: number
  trailingQuery?: TSupabaseQueryHandler<TableName>
  renderItem: (item: TSupabaseTableData<TableName>, index: number) => React.ReactNode
  className?: string
  containerClassName?: string
  renderNoResults?: () => React.ReactNode
  renderEndMessage?: () => React.ReactNode
  renderSkeleton?: (count: number) => React.ReactNode
}

const DefaultNoResults = () => (
  <div className="text-center text-muted-foreground py-10">No results.</div>
)

// const DefaultEndMessage = () => (
//   <div className="text-center text-muted-foreground py-4 text-sm">You&apos;ve reached the end.</div>
// )

const defaultSkeleton = (count: number) => (
  <div className="flex flex-col gap-2 px-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="h-4 w-full bg-muted animate-pulse" />
    ))}
  </div>
)

/** Renders a scrollable list with intersection-based load-more. */
export function InfiniteList<TableName extends TSupabaseTableName>({
  tableName,
  columns = '*',
  pageSize = 20,
  trailingQuery,
  renderItem,
  className,
  containerClassName,
  renderNoResults = DefaultNoResults,
//   renderEndMessage = DefaultEndMessage,
  renderSkeleton = defaultSkeleton,
}: IInfiniteListProps<TableName>) {
  const { data, isFetching, hasMore, fetchNextPage, isSuccess } = useInfiniteQuery({
    tableName,
    columns,
    pageSize,
    trailingQuery,
  })

  // Ref for the scrolling container
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  // Intersection observer logic - target the last rendered *item* or a dedicated sentinel
  const loadMoreSentinelRef = React.useRef<HTMLDivElement>(null)
  const observer = React.useRef<IntersectionObserver | null>(null)

  React.useEffect(() => {
    if (observer.current) observer.current.disconnect()

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching) {
          fetchNextPage()
        }
      },
      {
        root: scrollContainerRef.current, // Use the scroll container for scroll detection
        threshold: 0.1, // Trigger when 10% of the target is visible
        rootMargin: '0px 0px 100px 0px', // Trigger loading a bit before reaching the end
      }
    )

    if (loadMoreSentinelRef.current) {
      observer.current.observe(loadMoreSentinelRef.current)
    }

    return () => {
      if (observer.current) observer.current.disconnect()
    }
  }, [isFetching, hasMore, fetchNextPage])

  return (
    <div ref={scrollContainerRef} className={cn('relative h-full overflow-auto', className)}>
      <div className={containerClassName}>
        {isSuccess && data.length === 0 && renderNoResults()}

        {data.map((item, index) => renderItem(item, index))}

        {isFetching && renderSkeleton && renderSkeleton(pageSize)}

        <div ref={loadMoreSentinelRef} style={{ height: '1px' }} />

        {/* {!hasMore && data.length > 0 && renderEndMessage()} */}
      </div>
    </div>
  )
}
