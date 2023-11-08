export interface AlgoliaSearchHit {
	author: string;
	children?: [number];
	comment_text?: string;
	created_at: string;
	created_at_i: number;
	num_comments: number;
	objectID: string;
	points: number;
	story_text?: string;
	title: string;
	updated_at?: string;
	url?: string;
	_tags: string[];
}

export interface AlgoliaSearchResponse {
	hits: AlgoliaSearchHit[];
	page: number;
	nbHits: number;
	nbPages: number;
	hitsPerPage: number;
}

export interface HNApiResponse {
	by?: string;
	dead?: boolean;
	deleted?: boolean;
	descendants?: number;
	id: number;
	kids?: number[];
	parent?: number;
	parts?: unknown[];
	poll?: unknown;
	score?: number;
	text?: string;
	time?: number;
	title?: string;
	type?: string;
	url?: string;
}

export interface Comments {
	[key: `p${number}D${number}`]: HNApiResponse | undefined;
}

export type StoryWithComments = AlgoliaSearchHit & Comments;

export interface ProcessedStoryWithComments extends StoryWithComments {
	rssTime?: string;
}
