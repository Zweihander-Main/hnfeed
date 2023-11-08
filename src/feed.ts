import fs from 'fs';
import path from 'path';
import RSS from 'rss';
import { addCommentsToStory } from './comments';
import { fetchAlgoliaSearchData } from './stories';
import { processData, templateStory as templateStory } from './templating';
import { DIST_DIR, RSS_PATH, FEED_DATA } from './constants';

const writeFeedFile = (xml: string) => {
	console.log('Writing RSS feed file, starts with:', xml.slice(100, 200));
	if (!fs.existsSync(DIST_DIR)) {
		fs.mkdirSync(DIST_DIR, { recursive: true });
	}
	fs.writeFileSync(path.join(DIST_DIR, RSS_PATH), xml);
};

export const createRSSFeed = async (start?: number, end?: number) => {
	const searchData = await fetchAlgoliaSearchData(start, end);
	if (!searchData) return null;

	const searchAndCommentData = await addCommentsToStory(searchData.hits);
	if (!searchAndCommentData || searchAndCommentData.length === 0) {
		console.error('Error fetching comment data', searchAndCommentData);
		return;
	}

	const processedData = processData(searchAndCommentData);
	console.log('Processed data, first sample: ', processedData[0]);

	const feed = new RSS(FEED_DATA);
	for (const story of processedData) {
		const desc = await templateStory(story);
		feed.item({
			title: `${story.points}p | ${story.title}`,
			description: desc,
			url: `https://news.ycombinator.com/item?id=${story.objectID}`,
			guid: story.objectID,
			date: story.rssTime as string,
		});
	}

	const xml = feed.xml({ indent: true });
	writeFeedFile(xml);
	console.log('Created new RSS feed');
	return;
};

export const createDummyRSSFeed = () => {
	const feed = new RSS(FEED_DATA);
	const xml = feed.xml({ indent: true });
	writeFeedFile(xml);
	console.log('Created dummy RSS feed');
	return;
};
