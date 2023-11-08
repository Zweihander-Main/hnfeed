import { AllDataHit, HNApiResponse } from '../types';
import * as fetch from '../comments';

const sampleDataHit: AllDataHit = {
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
				default:
					result = null;
			}
			return Promise.resolve(result);
		});
	});

	it('should return empty if no data', async () => {
		const result = await fetch.fetchCommentData([]);
		expect(result).toEqual([]);
	});

	it('should return null if comment data is null', async () => {
		const result = await fetch.fetchCommentData([
			{ ...sampleDataHit, objectID: '999' },
		]);
		expect(result).toEqual(null);
	});

	it('should fetch expected comments', async () => {
		const result = await fetch.fetchCommentData([sampleDataHit]);

		expect(fetch.fetchHNApiObjectData).toHaveBeenCalled();
		expect(result && result[0].c1L1).toEqual(mockC1L1Comment);
		expect(result && result[0].c1L2).toEqual(mockC1L2Comment);
		expect(result && result[0].c2L1).toEqual(mockC2L1Comment);
		expect(result && result[0].c2L2).toEqual(mockC2L2Comment);
	});
});
