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

export interface AllDataHit extends AlgoliaSearchHit {
	c1L1?: HNApiResponse;
	c2L1?: HNApiResponse;
	c1L2?: HNApiResponse;
	c2L2?: HNApiResponse;
}

export interface ProcessedDataHit extends AllDataHit {
	rssTime?: string;
}