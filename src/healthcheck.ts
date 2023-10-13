/* eslint-disable no-process-exit */
import axios from 'axios';

const healthCheckURL = 'http://127.0.0.1:8080/rss_feed.xml';

const checkHealth = async () => {
	try {
		const response = await axios.get(healthCheckURL);

		if (response.status === 200) {
			console.log(`Health check passed: ${healthCheckURL} is alive.`);
		} else {
			console.error(
				`Health check failed: ${healthCheckURL} returned status ${response.status}.`
			);
			process.exit(1);
		}
	} catch (error) {
		console.error(`Health check failed: ${healthCheckURL} is unreachable.`);
		process.exit(1);
	}
};

void checkHealth();
