import type { AllDataHit, ProcessedDataHit } from './types';
import { DateTime } from 'luxon';
import { Liquid } from 'liquidjs';
import path from 'path';

const liquidEngine = new Liquid({
	root: path.resolve(__dirname, 'templates/'),
	extname: '.liquid',
	cache: true,
	greedy: true,
});

export const processData = (data: Array<AllDataHit>) => {
	const returnData: Array<ProcessedDataHit> = data.sort((a, b) => {
		if (a.points > b.points) return -1;
		if (a.points < b.points) return 1;
		return 0;
	});
	const currTime = new Date();
	returnData.map((hit) => {
		const adjustedDate = new Date(currTime.getTime() - hit.points * 1000);
		hit.rssTime = DateTime.fromJSDate(adjustedDate).toFormat(
			'EEE, dd MMM yyyy HH:mm:ss ZZ'
		);
		return hit;
	});
	return returnData;
};

export const templateHit = async (hit: ProcessedDataHit) => {
	const output = (await liquidEngine.renderFile('rss', hit)) as string;
	return output.replace(/[\n\t]/g, '');
};
