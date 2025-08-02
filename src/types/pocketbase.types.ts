/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Authorigins = "_authOrigins",
	Externalauths = "_externalAuths",
	Mfas = "_mfas",
	Otps = "_otps",
	Superusers = "_superusers",
	AccountDeletions = "account_deletions",
	Artists = "artists",
	Companies = "companies",
	ProgressNotes = "progress_notes",
	ProjectTags = "project_tags",
	Projects = "projects",
	RandomizerSpins = "randomizer_spins",
	Tags = "tags",
	UserDashboardSettings = "user_dashboard_settings",
	UserYearlyStats = "user_yearly_stats",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T }

// System fields
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string
	created?: IsoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated?: IsoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated?: IsoDateString
}

export type MfasRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	method: string
	recordRef: string
	updated?: IsoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated?: IsoDateString
}

export type SuperusersRecord = {
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated?: IsoDateString
	verified?: boolean
}

export type AccountDeletionsRecord = {
	created?: IsoDateString
	id: string
	notes?: string
	signup_method: string
	updated?: IsoDateString
	user_email: string
	user_id: string
}

export type ArtistsRecord = {
	created?: IsoDateString
	id: string
	name: string
	updated?: IsoDateString
	user: RecordIdString
}

export type CompaniesRecord = {
	created?: IsoDateString
	id: string
	name: string
	updated?: IsoDateString
	user: RecordIdString
	website_url?: string
}

export type ProgressNotesRecord = {
	content?: HTMLString
	created?: IsoDateString
	date: IsoDateString
	id: string
	image?: string
	project: RecordIdString
	updated?: IsoDateString
}

export type ProjectTagsRecord = {
	created?: IsoDateString
	id: string
	project: RecordIdString
	tag: RecordIdString
	updated?: IsoDateString
}

export enum ProjectsStatusOptions {
	"wishlist" = "wishlist",
	"purchased" = "purchased",
	"stash" = "stash",
	"progress" = "progress",
	"completed" = "completed",
	"archived" = "archived",
	"destashed" = "destashed",
	"onhold" = "onhold",
}

export enum ProjectsKitCategoryOptions {
	"full" = "full",
	"mini" = "mini",
}

export enum ProjectsDrillShapeOptions {
	"round" = "round",
	"square" = "square",
}
export type ProjectsRecord = {
	artist?: RecordIdString
	company?: RecordIdString
	created?: IsoDateString
	date_completed?: IsoDateString
	date_purchased?: IsoDateString
	date_received?: IsoDateString
	date_started?: IsoDateString
	drill_shape?: ProjectsDrillShapeOptions
	general_notes?: HTMLString
	height?: number
	id: string
	image?: string
	kit_category: ProjectsKitCategoryOptions
	source_url?: string
	status: ProjectsStatusOptions
	title: string
	total_diamonds?: number
	updated?: IsoDateString
	user: RecordIdString
	width?: number
}

export type RandomizerSpinsRecord<Tmetadata = unknown, Tselected_projects = unknown> = {
	created?: IsoDateString
	id: string
	metadata?: null | Tmetadata
	project: RecordIdString
	project_artist?: string
	project_company?: string
	project_title: string
	selected_count?: number
	selected_projects: null | Tselected_projects
	spun_at: IsoDateString
	updated?: IsoDateString
	user: RecordIdString
}

export type TagsRecord = {
	color: string
	created?: IsoDateString
	id: string
	name: string
	slug: string
	updated?: IsoDateString
	user: RecordIdString
}

export type UserDashboardSettingsRecord<Tnavigation_context = unknown> = {
	created?: IsoDateString
	id: string
	navigation_context?: null | Tnavigation_context
	updated?: IsoDateString
	user: RecordIdString
}


export enum UserYearlyStatsStatsTypeOptions {
	"yearly" = "yearly",
}
export type UserYearlyStatsRecord<Tstatus_breakdown = unknown> = {
	cache_version?: string
	calculation_duration_ms?: number
	completed_count?: number
	created?: IsoDateString
	estimated_drills?: number
	id: string
	in_progress_count?: number
	last_calculated: IsoDateString
	projects_included?: number
	started_count?: number
	stats_type: UserYearlyStatsStatsTypeOptions
	status_breakdown?: null | Tstatus_breakdown
	total_diamonds?: number
	updated?: IsoDateString
	user: RecordIdString
	year: number
}

export type UsersRecord = {
	avatar?: string
	beta_tester?: boolean
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	timezone?: string
	tokenKey: string
	updated?: IsoDateString
	username: string
	verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type AccountDeletionsResponse<Texpand = unknown> = Required<AccountDeletionsRecord> & BaseSystemFields<Texpand>
export type ArtistsResponse<Texpand = unknown> = Required<ArtistsRecord> & BaseSystemFields<Texpand>
export type CompaniesResponse<Texpand = unknown> = Required<CompaniesRecord> & BaseSystemFields<Texpand>
export type ProgressNotesResponse<Texpand = unknown> = Required<ProgressNotesRecord> & BaseSystemFields<Texpand>
export type ProjectTagsResponse<Texpand = unknown> = Required<ProjectTagsRecord> & BaseSystemFields<Texpand>
export type ProjectsResponse<Texpand = unknown> = Required<ProjectsRecord> & BaseSystemFields<Texpand>
export type RandomizerSpinsResponse<Tmetadata = unknown, Tselected_projects = unknown, Texpand = unknown> = Required<RandomizerSpinsRecord<Tmetadata, Tselected_projects>> & BaseSystemFields<Texpand>
export type TagsResponse<Texpand = unknown> = Required<TagsRecord> & BaseSystemFields<Texpand>
export type UserDashboardSettingsResponse<Tnavigation_context = unknown, Texpand = unknown> = Required<UserDashboardSettingsRecord<Tnavigation_context>> & BaseSystemFields<Texpand>
export type UserYearlyStatsResponse<Tstatus_breakdown = unknown, Texpand = unknown> = Required<UserYearlyStatsRecord<Tstatus_breakdown>> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	account_deletions: AccountDeletionsRecord
	artists: ArtistsRecord
	companies: CompaniesRecord
	progress_notes: ProgressNotesRecord
	project_tags: ProjectTagsRecord
	projects: ProjectsRecord
	randomizer_spins: RandomizerSpinsRecord
	tags: TagsRecord
	user_dashboard_settings: UserDashboardSettingsRecord
	user_yearly_stats: UserYearlyStatsRecord
	users: UsersRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	account_deletions: AccountDeletionsResponse
	artists: ArtistsResponse
	companies: CompaniesResponse
	progress_notes: ProgressNotesResponse
	project_tags: ProjectTagsResponse
	projects: ProjectsResponse
	randomizer_spins: RandomizerSpinsResponse
	tags: TagsResponse
	user_dashboard_settings: UserDashboardSettingsResponse
	user_yearly_stats: UserYearlyStatsResponse
	users: UsersResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: '_authOrigins'): RecordService<AuthoriginsResponse>
	collection(idOrName: '_externalAuths'): RecordService<ExternalauthsResponse>
	collection(idOrName: '_mfas'): RecordService<MfasResponse>
	collection(idOrName: '_otps'): RecordService<OtpsResponse>
	collection(idOrName: '_superusers'): RecordService<SuperusersResponse>
	collection(idOrName: 'account_deletions'): RecordService<AccountDeletionsResponse>
	collection(idOrName: 'artists'): RecordService<ArtistsResponse>
	collection(idOrName: 'companies'): RecordService<CompaniesResponse>
	collection(idOrName: 'progress_notes'): RecordService<ProgressNotesResponse>
	collection(idOrName: 'project_tags'): RecordService<ProjectTagsResponse>
	collection(idOrName: 'projects'): RecordService<ProjectsResponse>
	collection(idOrName: 'randomizer_spins'): RecordService<RandomizerSpinsResponse>
	collection(idOrName: 'tags'): RecordService<TagsResponse>
	collection(idOrName: 'user_dashboard_settings'): RecordService<UserDashboardSettingsResponse>
	collection(idOrName: 'user_yearly_stats'): RecordService<UserYearlyStatsResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
}
