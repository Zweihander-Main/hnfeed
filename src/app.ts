import axios from 'axios';
import moment from 'moment';
import RSS from 'rss';
import fs from 'fs';
import path from 'path';
import { Liquid } from 'liquidjs';
// import { CronJob } from 'node-cron';

const TIMESTAMP_HOUR = 10;
const TIMESTAMP_MINUTE = 0;
const HITS_LIMIT = 10000;
const THROTTLE_TIME = 100;

const DIST_DIR = './dist';
const RSS_PATH = './rss_feed.xml';
// TODO: allow custom dates

interface AlgoliaSearchHit {
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

interface AlgoliaSearchResponse {
	hits: AlgoliaSearchHit[];
	page: number;
	nbHits: number;
	nbPages: number;
	hitsPerPage: number;
}

interface HNApiResponse {
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

const liquidEngine = new Liquid({
	root: path.resolve(__dirname, 'templates/'),
	extname: '.liquid',
	cache: true,
	greedy: true,
});

const createTimeStampData = () => {
	const currentTime = new Date();
	const t24HrAgo = new Date();
	const t12HrAgo = new Date();
	if (currentTime.getHours() < 12) {
		// Before noon
		t24HrAgo.setDate(t24HrAgo.getDate() - 1);
		t24HrAgo.setHours(TIMESTAMP_HOUR, TIMESTAMP_MINUTE, 0, 0);
		t12HrAgo.setDate(t12HrAgo.getDate() - 1);
		t12HrAgo.setHours(TIMESTAMP_HOUR + 12, TIMESTAMP_MINUTE, 0, 0);
	} else {
		// After noon
		t24HrAgo.setDate(t24HrAgo.getDate() - 1);
		t24HrAgo.setHours(TIMESTAMP_HOUR + 12, TIMESTAMP_MINUTE, 0, 0);
		t12HrAgo.setHours(TIMESTAMP_HOUR, TIMESTAMP_MINUTE, 0, 0);
	}
	const returnData = {
		t24HrAgo: t24HrAgo.getTime() / 1000,
		t12HrAgo: t12HrAgo.getTime() / 1000,
	};
	console.log('Timestamp fetching for:', returnData);
	return returnData;
};

const createAlgoliaSearchUrl = () => {
	const { t12HrAgo, t24HrAgo } = createTimeStampData();
	return `https://hn.algolia.com/api/v1/search?tags=story&numericFilters=created_at_i%3E${t24HrAgo},created_at_i%3C${t12HrAgo},points%3E12&hitsPerPage=${HITS_LIMIT}`;
};

const validateAlgoliaSearchResponse = (response: AlgoliaSearchResponse) => {
	if (response.hits.length === 0) {
		throw new Error('Validation error: No results found');
	}
};

const fetchAlgoliaSearchData = async () => {
	try {
		const url = createAlgoliaSearchUrl();
		console.log('Fetching Algolia Search data', url);
		const response = await axios.get<AlgoliaSearchResponse>(url, {
			validateStatus: (status) => status < 500,
		});
		validateAlgoliaSearchResponse(response.data);
		return response.data;
	} catch (error) {
		console.error('Error fetching Algolia Search data:', error);
		return null;
	}
};

const createHNApiUrl = (objectID: string) => {
	return `https://hacker-news.firebaseio.com/v0/item/${objectID}.json`;
};

const fetchHNApiObjectData = async (objectID: string) => {
	try {
		await new Promise((resolve) => setTimeout(resolve, THROTTLE_TIME));
		console.log('Fetching HN API data', objectID);
		const response = await axios.get<HNApiResponse>(
			createHNApiUrl(objectID),
			{
				validateStatus: (status) => status < 500,
			}
		);
		return response.data;
	} catch (error) {
		console.error(`Error fetching HN API data for ${objectID}:`, error);
		return null;
	}
};

interface AllDataHit extends AlgoliaSearchHit {
	c1L1?: HNApiResponse;
	c2L1?: HNApiResponse;
	c1L2?: HNApiResponse;
	c2L2?: HNApiResponse;
}

const fetchAllData = async () => {
	const searchData = await fetchAlgoliaSearchData();
	if (!searchData) return null;
	const allData: Array<AllDataHit> = searchData.hits;
	for (let i = 0, len = allData.length; i < len; i++) {
		const hit = allData[i];
		const storyCommentsData = await fetchHNApiObjectData(hit.objectID);
		if (!storyCommentsData) return null;
		const parentKids = storyCommentsData.kids;
		if (!parentKids || parentKids.length === 0) return allData;
		const comment1Level1 = await fetchHNApiObjectData(
			parentKids[0].toString()
		);
		if (comment1Level1) {
			allData[i].c1L1 = comment1Level1;
			if (comment1Level1.kids && comment1Level1.kids[0]) {
				const comment1Level2 = await fetchHNApiObjectData(
					comment1Level1.kids[0].toString()
				);
				if (comment1Level2) {
					allData[i].c1L2 = comment1Level2;
				}
			}
		}
		if (parentKids[1]) {
			const comment2Level1 = await fetchHNApiObjectData(
				parentKids[1].toString()
			);
			if (comment2Level1) {
				allData[i].c2L1 = comment2Level1;
				if (comment2Level1.kids && comment2Level1.kids[0]) {
					const comment2Level2 = await fetchHNApiObjectData(
						comment2Level1.kids[0].toString()
					);
					if (comment2Level2) {
						allData[i].c2L2 = comment2Level2;
					}
				}
			}
		}
	}
	return null;
};

interface ProcessedDataHit extends AllDataHit {
	rssTime?: string;
}

const processData = (data: Array<AllDataHit>) => {
	const returnData: Array<ProcessedDataHit> = data.sort((a, b) => {
		if (a.points > b.points) return -1;
		if (a.points < b.points) return 1;
		return 0;
	});
	const currTime = new Date();
	returnData.map((hit) => {
		const adjustedDate = new Date(currTime.getTime() - hit.points * 1000);
		hit.rssTime = moment(adjustedDate).format(
			'ddd, DD MMM YYYY HH:mm:ss ZZ'
		);
		return hit;
	});
	return returnData;
};

const templateHit = async (hit: ProcessedDataHit) => {
	const output = (await liquidEngine.renderFile('rss', hit)) as string;
	return output;
};

const createRSSFeed = async () => {
	const hnData = await fetchAllData();
	if (!hnData) return;
	const processedData = processData(hnData);
	const feed = new RSS({
		title: 'Hacker News RSS Feed',
		description: 'HN Items with Comments',
		feed_url: 'https://example.com/rss.xml', // TODO
		site_url: 'https://news.ycombinator.com/',
	});
	for (const hit of processedData) {
		const desc = await templateHit(hit);
		feed.item({
			title: hit.title,
			description: desc,
			url: hit.url || '',
			guid: hit.objectID,
			date: hit.rssTime as string,
		});
	}

	const xml = feed.xml({ indent: true });
	if (!fs.existsSync(DIST_DIR)) {
		fs.mkdirSync(DIST_DIR, { recursive: true });
	}
	fs.writeFileSync(path.join(DIST_DIR, RSS_PATH), xml);
	return;
};

void createRSSFeed();

// // Schedule the script to run twice a day (adjust the cron schedule as needed)
// const job = new CronJob(
// 	'0 0 * * *',
// 	createRSSFeed,
// 	null,
// 	true,
// 	'America/New_York'
// );
// job.start();
