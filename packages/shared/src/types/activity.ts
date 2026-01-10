import {
    ActivityCategory,
    ActivityOutcome,
    ActivitySeverity,
} from '../constants/activity'

export type TActivityCategory = typeof ActivityCategory[keyof typeof ActivityCategory]

export type TActivityOutcome = typeof ActivityOutcome[keyof typeof ActivityOutcome]

export type TActivitySeverity = typeof ActivitySeverity[keyof typeof ActivitySeverity]

export type TActivitySource = string
