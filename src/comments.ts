import axios from 'axios';
import { THROTTLE_TIME } from './constants';
import { AllDataHit, HNApiResponse } from './types';

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

export const fetchCommentData = async (allData: Array<AllDataHit>) => {
	for (let i = 0, len = allData.length; i < len; i++) {
		const hit = allData[i];
		const storyCommentsData = await fetchHNApiObjectData(hit.objectID);
		if (!storyCommentsData) return null;
		const parentKids = storyCommentsData.kids;
		if (!parentKids || parentKids.length === 0) return allData;
		const comment1Level1 = await fetchHNApiObjectData(
			parentKids[0].toString()
		);
		if (comment1Level1) {
			allData[i].c1L1 = comment1Level1;
			if (comment1Level1.kids && comment1Level1.kids[0]) {
				const comment1Level2 = await fetchHNApiObjectData(
					comment1Level1.kids[0].toString()
				);
				if (comment1Level2) {
					allData[i].c1L2 = comment1Level2;
				}
			}
		}
		if (parentKids[1]) {
			const comment2Level1 = await fetchHNApiObjectData(
				parentKids[1].toString()
			);
			if (comment2Level1) {
				allData[i].c2L1 = comment2Level1;
				if (comment2Level1.kids && comment2Level1.kids[0]) {
					const comment2Level2 = await fetchHNApiObjectData(
						comment2Level1.kids[0].toString()
					);
					if (comment2Level2) {
						allData[i].c2L2 = comment2Level2;
					}
				}
			}
		}
	}
	return allData;
};
