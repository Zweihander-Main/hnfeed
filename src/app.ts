import axios from 'axios';
import moment from 'moment';
import RSS from 'rss';
import fs from 'fs';
import path from 'path';
import { Liquid } from 'liquidjs';
import yargs from 'yargs/yargs';
import express from 'express';
import cron from 'node-cron';
import { DateTime } from 'luxon';

const TIMESTAMP_HOUR = 10;
const TIMESTAMP_MINUTE = 0;
const HITS_LIMIT = 10000;
const THROTTLE_TIME = 500;

const DIST_DIR = 'public';
const RSS_PATH = 'rss_feed.xml';
const HOST_URL = 'https://example.com';
const CRON_SCHEDULE = '30 8,20 * * *';
const TIMEZONE = 'America/New_York';
const PORT = 8080;

const feedData = {
	title: 'Hacker News RSS Feed',
	description: 'HN Items with Comments',
	feed_url: `${HOST_URL}/${RSS_PATH}}`,
	site_url: 'https://news.ycombinator.com/',
};

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
	const currentTime = DateTime.now().setZone(TIMEZONE);
	let t24HrAgo = currentTime.minus({ hours: 24 });
	let t12HrAgo = currentTime.minus({ hours: 12 });
	if (currentTime.hour < 12) {
		// Before noon
		t24HrAgo = t24HrAgo.minus({ days: 1 }).set({
			hour: TIMESTAMP_HOUR,
			minute: TIMESTAMP_MINUTE,
			second: 0,
			millisecond: 0,
		});
		t12HrAgo = t12HrAgo.minus({ days: 1 }).set({
			hour: TIMESTAMP_HOUR + 12,
			minute: TIMESTAMP_MINUTE,
			second: 0,
			millisecond: 0,
		});
	} else {
		t24HrAgo = t24HrAgo.minus({ days: 1 }).set({
			hour: TIMESTAMP_HOUR + 12,
			minute: TIMESTAMP_MINUTE,
			second: 0,
			millisecond: 0,
		});
		t12HrAgo = t12HrAgo.set({
			hour: TIMESTAMP_HOUR,
			minute: TIMESTAMP_MINUTE,
			second: 0,
			millisecond: 0,
		});
	}
	const returnData = {
		t24HrAgo: t24HrAgo.toSeconds(),
		t12HrAgo: t12HrAgo.toSeconds(),
	};
	console.log('Created timestamp for:', returnData);
	console.log(
		'Timestamp will be from',
		t24HrAgo.toString(),
		'to',
		t12HrAgo.toString()
	);
	return returnData;
};

const createAlgoliaSearchUrl = (start?: number, end?: number) => {
	const { t12HrAgo, t24HrAgo } =
		start && end
			? { t24HrAgo: start, t12HrAgo: end }
			: createTimeStampData();
	return `https://hn.algolia.com/api/v1/search?tags=story&numericFilters=created_at_i%3E${t24HrAgo},created_at_i%3C${t12HrAgo},points%3E12&hitsPerPage=${HITS_LIMIT}`;
};

const validateAlgoliaSearchResponse = (response: AlgoliaSearchResponse) => {
	if (response.hits.length === 0) {
		throw new Error('Validation error: No results found');
	}
};

const fetchAlgoliaSearchData = async (start?: number, end?: number) => {
	try {
		const url = createAlgoliaSearchUrl(start, end);
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

const fetchCommentData = async (allData: Array<AllDataHit>) => {
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

const writeFeedFile = (xml: string) => {
	console.log('Writing RSS feed file, starts with:', xml.slice(0, 100));
	if (!fs.existsSync(DIST_DIR)) {
		fs.mkdirSync(DIST_DIR, { recursive: true });
	}
	fs.writeFileSync(path.join(DIST_DIR, RSS_PATH), xml);
};

const createRSSFeed = async (start?: number, end?: number) => {
	const searchData = await fetchAlgoliaSearchData(start, end);
	if (!searchData) return null;
	const searchAndCommentData = await fetchCommentData(searchData.hits);
	if (!searchAndCommentData) return;
	const processedData = processData(searchAndCommentData);
	const feed = new RSS(feedData);
	for (const hit of processedData) {
		const desc = await templateHit(hit);
		feed.item({
			title: `${hit.points}p | ${hit.title}`,
			description: desc,
			url: hit.url || '',
			guid: hit.objectID,
			date: hit.rssTime as string,
		});
	}

	const xml = feed.xml({ indent: true });
	writeFeedFile(xml);
	console.log('Created new RSS feed');
	return;
};

const createDummyRSSFeed = () => {
	const feed = new RSS(feedData);
	const xml = feed.xml({ indent: true });
	writeFeedFile(xml);
	console.log('Created dummy RSS feed');
	return;
};

const yargsParser = yargs(process.argv.slice(2)).options({
	start: { type: 'number', default: null, alias: 's' },
	end: { type: 'number', default: null, alias: 'e' },
});

void (async () => {
	const argv = await yargsParser.argv;
	if (argv.start && argv.end) {
		console.log('Creating RSS feed for custom dates');
		await createRSSFeed(argv.start, argv.end);
	} else {
		console.log('Setting up cron', CRON_SCHEDULE);
		cron.schedule(
			CRON_SCHEDULE,
			() => {
				console.log('Running cron job');
				try {
					void createRSSFeed();
				} catch (error) {
					console.error('Error running cron job:', error);
				}
			},
			{
				scheduled: true,
				timezone: TIMEZONE,
			}
		);

		if (!fs.existsSync(path.join(DIST_DIR, RSS_PATH))) {
			createDummyRSSFeed();
		}

		const app = express();
		app.get(`/${RSS_PATH}`, (_req, res) => {
			res.sendFile(RSS_PATH, {
				root: path.join(__dirname, '../', DIST_DIR),
			});
		});
		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	}
})();
