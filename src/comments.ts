import axios from 'axios';
import { COMMENT_DEPTH, COMMENT_PARENTS, THROTTLE_TIME } from './constants';
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
		return;
	}
};

/**
 * @param id id of the root story
 *
 * Note that returned object is in format p#d# where p is the parent comment
 * and d is the depth of the comment. For example, p1d1 is the first comment
 * on the root story, p2d1 is the first comment on the first comment on the
 * root story, and so on.
 */
const fetchCommentDataForStory = async (id: string) => {
	const comments: Comments = {};
	const rootStory = await fetchHNApiObjectData(id);
	if (!rootStory || !rootStory?.kids?.[0]) return comments;

	for (let p = 1, len = COMMENT_PARENTS; p <= len; p++) {
		const parentIdToFetch = rootStory.kids[p - 1]?.toString();
		if (parentIdToFetch) {
			comments[`p${p}D1`] = await fetchHNApiObjectData(parentIdToFetch);
			for (let d = 2, len = COMMENT_DEPTH; d <= len; d++) {
				const childIdToFetch =
					comments[`p${p}D${d - 1}`]?.kids?.[0]?.toString();
				if (childIdToFetch) {
					comments[`p${p}D${d}`] =
						await fetchHNApiObjectData(childIdToFetch);
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
