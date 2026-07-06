import axios from 'axios';
import { createTimeStampData } from './timestamps';
import { AlgoliaSearchResponse } from './types';
import { HITS_LIMIT, POINTS_LIMIT } from './constants';

const createAlgoliaSearchUrl = (start?: number, end?: number) => {
	const { t12HrAgo, t24HrAgo } =
		start && end
			? { t24HrAgo: start, t12HrAgo: end }
			: createTimeStampData();
	return `https://hn.algolia.com/api/v1/search?tags=story&numericFilters=created_at_i%3E${t24HrAgo},created_at_i%3C${t12HrAgo}&hitsPerPage=${HITS_LIMIT}`;
};

const validateAlgoliaSearchResponse = (response: AlgoliaSearchResponse) => {
	if (response.hits.length === 0) {
		throw new Error('Validation error: No results found');
	}
};

export const fetchAlgoliaSearchData = async (start?: number, end?: number) => {
	try {
		const url = createAlgoliaSearchUrl(start, end);
		console.log('Fetching Algolia Search data', url);
		const response = await axios.get<AlgoliaSearchResponse>(url, {
			validateStatus: (status) => status < 500,
		});

		/* Filter points since API point filtering is now (7.26) broken. */
		response.data.hits = response.data.hits.filter(
			(hit) => hit.points > POINTS_LIMIT
		);

		validateAlgoliaSearchResponse(response.data);
		return response.data;
	} catch (error) {
		console.error('Error fetching Algolia Search data:', error);
		return null;
	}
};
