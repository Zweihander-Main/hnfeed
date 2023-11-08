import fs from 'fs';
import path from 'path';
import yargs from 'yargs/yargs';
import express from 'express';
import cron from 'node-cron';
import { DIST_DIR, RSS_PATH, PORT, CRON_SCHEDULE, TIMEZONE } from './constants';
import { createDummyRSSFeed, createRSSFeed } from './rss';

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
