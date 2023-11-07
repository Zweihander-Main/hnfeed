import axios from 'axios';
import moment from 'moment';
import RSS from 'rss';
import fs from 'fs';
import path from 'path';
import { Liquid } from 'liquidjs';
import yargs from 'yargs/yargs';
import express from 'express';
import cron from 'node-cron';
import { createTimeStampData } from './timestamps';
import {
	THROTTLE_TIME,
	HITS_LIMIT,
	DIST_DIR,
	RSS_PATH,
	PORT,
	CRON_SCHEDULE,
	FEED_DATA,
	TIMEZONE,
} from './constants';

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
	return output.replace(/[\n\t]/g, '');
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
	const feed = new RSS(FEED_DATA);
	for (const hit of processedData) {
		const desc = await templateHit(hit);
		feed.item({
			title: `${hit.points}p | ${hit.title}`,
			description: desc,
			url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
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
	const feed = new RSS(FEED_DATA);
	const xml = feed.xml({ indent: true });
	writeFeedFile(xml);
	console.log('Created dummy RSS feed');
	return;
};

const yargsParser = yargs(process.argv.slice(2)).options({
	start: { type: 'number', default: null, alias: 's' },
	end: { type: 'number', default: null, alias: 'e' },
});

(async () => {
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
})().catch((error) => {
	console.error('Error running app:', error);
});
