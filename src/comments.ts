import axios from 'axios';
import { THROTTLE_TIME } from './constants';
import {
	AlgoliaSearchHit,
	StoryWithComments,
	Comments,
	HNApiResponse,
} from './types';

const createHNApiUrl = (objectID: string) => {
	return `https://hacker-news.firebaseio.com/v0/item/${objectID}.json`;
};

export const fetchHNApiObjectData = async (objectID: string) => {
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

const fetchCommentDataForStory = async (id: string) => {
	const rootStory = await fetchHNApiObjectData(id);
	if (!rootStory || !rootStory?.kids?.[0]) return {} as Comments;

	const [comment1Level1, comment2Level1] = await Promise.all(
		rootStory.kids
			.slice(0, 2)
			.map((kid) => fetchHNApiObjectData(kid.toString())) || []
	);

	const comment1Level2 =
		comment1Level1 &&
		comment1Level1?.kids?.[0] &&
		(await fetchHNApiObjectData(comment1Level1.kids[0].toString()));
	const comment2Level2 =
		comment1Level1 &&
		comment2Level1?.kids?.[0] &&
		(await fetchHNApiObjectData(comment2Level1.kids[0].toString()));

	const comments: Comments = {
		c1L1: comment1Level1 || undefined,
		c1L2: comment1Level2 || undefined,
		c2L1: comment2Level1 || undefined,
		c2L2: comment2Level2 || undefined,
	};
	return comments;
};

export const addCommentsToStory = async (
	storyDataArray: Array<AlgoliaSearchHit>
) => {
	const storyWithCommentsArray: Array<StoryWithComments> = [];
	for (const story of storyDataArray) {
		const comments = await fetchCommentDataForStory(story.objectID);
		const storyWithComments = { ...story, ...comments };
		storyWithCommentsArray.push(storyWithComments);
	}
	return storyWithCommentsArray;
};
