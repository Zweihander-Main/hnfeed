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
	const comments: Comments = {};
	const rootStory = await fetchHNApiObjectData(id);
	if (!rootStory) return comments;
	const rootKids = rootStory.kids;
	if (!rootKids || rootKids.length === 0) return comments;
	const comment1Level1 = await fetchHNApiObjectData(rootKids[0].toString());
	if (comment1Level1) {
		comments.c1L1 = comment1Level1;
		if (comment1Level1.kids && comment1Level1.kids[0]) {
			const comment1Level2 = await fetchHNApiObjectData(
				comment1Level1.kids[0].toString()
			);
			if (comment1Level2) {
				comments.c1L2 = comment1Level2;
			}
		}
	}
	if (rootKids[1]) {
		const comment2Level1 = await fetchHNApiObjectData(
			rootKids[1].toString()
		);
		if (comment2Level1) {
			comments.c2L1 = comment2Level1;
			if (comment2Level1.kids && comment2Level1.kids[0]) {
				const comment2Level2 = await fetchHNApiObjectData(
					comment2Level1.kids[0].toString()
				);
				if (comment2Level2) {
					comments.c2L2 = comment2Level2;
				}
			}
		}
	}
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
