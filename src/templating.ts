import type { StoryWithComments, ProcessedStoryWithComments } from './types';
import { DateTime } from 'luxon';
import { Liquid } from 'liquidjs';
import path from 'path';

const liquidEngine = new Liquid({
	root: path.resolve(__dirname, 'templates/'),
	extname: '.liquid',
	cache: true,
	greedy: true,
});

export const processData = (data: Array<StoryWithComments>) => {
	const returnData: Array<ProcessedStoryWithComments> = data.sort((a, b) => {
		if (a.points > b.points) return -1;
		if (a.points < b.points) return 1;
		return 0;
	});
	const currTime = new Date();
	returnData.map((story) => {
		const adjustedDate = new Date(currTime.getTime() - story.points * 1000);
		story.rssTime = DateTime.fromJSDate(adjustedDate).toFormat(
			'EEE, dd MMM yyyy HH:mm:ss ZZ'
		);
		return story;
	});
	return returnData;
};

export const templateStory = async (story: ProcessedStoryWithComments) => {
	const output = (await liquidEngine.renderFile('rss', story)) as string;
	return output.replace(/[\n\t]/g, '');
};
