import { StoryWithComments, HNApiResponse } from '../types';
import * as fetch from '../comments';

const sampleDataHit: StoryWithComments = {
	author: 'test',
	created_at: 'test',
	created_at_i: 123,
	num_comments: 0,
	objectID: '1',
	points: 0,
	title: 'test',
	_tags: ['test'],
};

const storyCommentsData: HNApiResponse = {
	kids: [11, 21],
	id: 1,
};

const storyCommentsDataWithNoKids: HNApiResponse = {
	kids: [],
	id: 3,
};

const storyCommentsDataWithOneKids: HNApiResponse = {
	kids: [41],
	id: 4,
};

const storyCommentsDataWithTwoKids: HNApiResponse = {
	kids: [41, 51],
	id: 5,
};

const mockC1L1Comment: HNApiResponse = {
	kids: [12],
	id: 11,
};

const mockC1L2Comment: HNApiResponse = {
	kids: [13],
	id: 12,
};

const mockC2L1Comment: HNApiResponse = {
	kids: [22],
	id: 21,
};

const mockC2L2Comment: HNApiResponse = {
	kids: [],
	id: 22,
};

const mockC1L1CommentWithNoKids: HNApiResponse = {
	kids: [],
	id: 41,
};

const mockC2L1CommentWithNoKids: HNApiResponse = {
	kids: [],
	id: 51,
};

describe('fetchCommentData', () => {
	const fetchHNApiObjectData = jest.spyOn(fetch, 'fetchHNApiObjectData');

	beforeEach(() => {
		// Stub implementation
		jest.mock('../comments', () => ({
			fetchHNApiObjectData: jest.fn(),
		}));
		fetchHNApiObjectData.mockImplementation((input) => {
			let result: HNApiResponse | null = null;
			switch (input) {
				case '1':
					result = storyCommentsData;
					break;
				case '11':
					result = mockC1L1Comment;
					break;
				case '12':
					result = mockC1L2Comment;
					break;
				case '21':
					result = mockC2L1Comment;
					break;
				case '22':
					result = mockC2L2Comment;
					break;
				case '3':
					result = storyCommentsDataWithNoKids;
					break;
				case '4':
					result = storyCommentsDataWithOneKids;
					break;
				case '41':
					result = mockC1L1CommentWithNoKids;
					break;
				case '5':
					result = storyCommentsDataWithTwoKids;
					break;
				case '51':
					result = mockC2L1CommentWithNoKids;
					break;
				default:
					result = null;
			}
			return Promise.resolve(result);
		});
	});

	it('should return empty if no data', async () => {
		const result = await fetch.addCommentsToStory([]);
		expect(result).toEqual([]);
	});

	it('should return null if comment data is null', async () => {
		const nullStory = { ...sampleDataHit, objectID: '999' };
		const result = await fetch.addCommentsToStory([nullStory]);
		expect(result).toEqual([nullStory]);
	});

	it('should fetch expected comments in full tree', async () => {
		const result = await fetch.addCommentsToStory([sampleDataHit]);

		expect(fetch.fetchHNApiObjectData).toHaveBeenCalled();
		expect(result && result[0].c1L1).toEqual(mockC1L1Comment);
		expect(result && result[0].c1L2).toEqual(mockC1L2Comment);
		expect(result && result[0].c2L1).toEqual(mockC2L1Comment);
		expect(result && result[0].c2L2).toEqual(mockC2L2Comment);
	});

	it('should fetch expected comments with no children', async () => {
		const result = await fetch.addCommentsToStory([
			{ ...sampleDataHit, objectID: '3' },
		]);
		expect(result && result[0].c1L1).toEqual(undefined);
		expect(result && result[0].c2L1).toEqual(undefined);
	});

	it('should fetch expected comments with one child', async () => {
		const result = await fetch.addCommentsToStory([
			{ ...sampleDataHit, objectID: '4' },
		]);
		expect(result && result[0].c1L1).toEqual(mockC1L1CommentWithNoKids);
		expect(result && result[0].c1L2).toEqual(undefined);
		expect(result && result[0].c2L1).toEqual(undefined);
	});

	it('should fetch expected comments with two first level children', async () => {
		const result = await fetch.addCommentsToStory([
			{ ...sampleDataHit, objectID: '5' },
		]);
		expect(result && result[0].c1L1).toEqual(mockC1L1CommentWithNoKids);
		expect(result && result[0].c1L2).toEqual(undefined);
		expect(result && result[0].c2L1).toEqual(mockC2L1CommentWithNoKids);
		expect(result && result[0].c2L2).toEqual(undefined);
	});
});
