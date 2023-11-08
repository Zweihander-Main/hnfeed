import RSS from 'rss';
import fs from 'fs';
import path from 'path';
import yargs from 'yargs/yargs';
import express from 'express';
import cron from 'node-cron';
import { fetchCommentData } from './comments';
import { fetchAlgoliaSearchData } from './stories';
import { processData, templateHit } from './templating';
import {
	DIST_DIR,
	RSS_PATH,
	PORT,
	CRON_SCHEDULE,
	FEED_DATA,
	TIMEZONE,
} from './constants';

const writeFeedFile = (xml: string) => {
	console.log('Writing RSS feed file, starts with:', xml.slice(100, 200));
	if (!fs.existsSync(DIST_DIR)) {
		fs.mkdirSync(DIST_DIR, { recursive: true });
	}
	fs.writeFileSync(path.join(DIST_DIR, RSS_PATH), xml);
};

const createRSSFeed = async (start?: number, end?: number) => {
	const searchData = await fetchAlgoliaSearchData(start, end);
	if (!searchData) return null;

	const searchAndCommentData = await fetchCommentData(searchData.hits);
	if (!searchAndCommentData || searchAndCommentData.length === 0) {
		console.error('Error fetching comment data', searchAndCommentData);
		return;
	}

	const processedData = processData(searchAndCommentData);
	console.log('Processed data, first sample: ', processedData[0]);

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
