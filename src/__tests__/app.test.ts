import { DateTime } from 'luxon';
import { createTimeStampData } from '../app.ts';

test('createTimeStampData', () => {
	const { t24HrAgo, t12HrAgo } = createTimeStampData();
	const t24HrAgoDT = DateTime.fromSeconds(t24HrAgo);
	const t12HrAgoDT = DateTime.fromSeconds(t12HrAgo);
	expect(t24HrAgoDT.toSeconds()).toBe(t24HrAgo);
	expect(t12HrAgoDT.toSeconds()).toBe(t12HrAgo);
	expect(t24HrAgoDT.toSeconds()).toBeLessThan(t12HrAgoDT.toSeconds());
});
