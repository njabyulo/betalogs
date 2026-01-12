import type { ComponentProps } from 'react'
import type { TStoryOutput } from '~/lib/schemas'
import type {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible'

export type TActivityEventType = 'file' | 'meeting' | 'comment' | 'mention' | 'rule' | 'tag' | 'assignment' | 'creation' | 'email'

export interface IActivityEvent {
  id: string
  type: TActivityEventType
  icon?: React.ReactNode
  user?: {
    name: string
    avatar?: string
    initial: string
  }
  action: string
  timestamp: Date | string
  content?: string
  details?: string
  participants?: string[]
  threadCount?: number
  email?: string
  citations?: string[]
}

export interface ICitation {
  id: string
  title?: string
  sourceId?: string
  occurredAt?: string
  viewLink?: string
}

export interface IActivityTimelineProps {
  events: IActivityEvent[]
  storySummary?: TStoryOutput['story'] | null
  isLoadingFullLogs?: boolean
  onLoadFullLogs?: () => void
  cacheStatus?: 'fresh' | 'cached' | null
  hasFullLogs?: boolean
}

export interface ICommentInputProps {
  onSubmit: (message: string) => void
  isLoading?: boolean
  placeholder?: string
  icon?: React.ReactNode
}

export interface IEventItemProps {
  event: IActivityEvent
  isLast?: boolean
}

export interface ISummaryCardProps {
  story: TStoryOutput['story']
}

export type TSourcesProps = ComponentProps<typeof Collapsible>

export type TSourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number
}

export type TSourcesContentProps = ComponentProps<typeof CollapsibleContent>

export type TSourceProps = ComponentProps<'a'> & {
  citation: ICitation
}

export interface IUseCommentInputProps {
  onSubmit: (message: string) => void
  isLoading?: boolean
}

export interface IUseEventItemProps {
  event: IActivityEvent
}

export interface IUseSourceProps {
  citation: ICitation
  href?: string
  title?: string
}

export interface IUseSummaryCardProps {
  story: TStoryOutput['story']
}

export type { TStoryOutput }
