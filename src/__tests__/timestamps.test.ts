import { DateTime } from 'luxon';
import { createTimeStampData } from '../timestamps';
import { TIMEZONE, TIMESTAMP_HOUR, TIMESTAMP_MINUTE } from '../constants';

test('createTimeStampData', () => {
	const { t24HrAgo, t12HrAgo } = createTimeStampData();
	const today = DateTime.now().setZone(TIMEZONE);
	const t24HrAgoDT = DateTime.fromSeconds(t24HrAgo);
	const t12HrAgoDT = DateTime.fromSeconds(t12HrAgo);

	expect(t24HrAgoDT.toSeconds()).toBeLessThan(t12HrAgoDT.toSeconds());

	expect(t24HrAgoDT.minute).toBe(TIMESTAMP_MINUTE);
	expect(t12HrAgoDT.minute).toBe(TIMESTAMP_MINUTE);
	expect(t24HrAgoDT.setZone(TIMEZONE).toString()).toBe(t24HrAgoDT.toString());
	expect(t12HrAgoDT.setZone(TIMEZONE).toString()).toBe(t12HrAgoDT.toString());

	expect(t24HrAgoDT.day).toBe(today.day - 1);

	if (t24HrAgoDT.hour < 12) {
		expect(t24HrAgoDT.hour).toBe(TIMESTAMP_HOUR);
		expect(t12HrAgoDT.hour).toBe(TIMESTAMP_HOUR + 12);
		expect(t24HrAgoDT.day).toBe(t12HrAgoDT.day);
	} else {
		expect(t24HrAgoDT.hour).toBe(TIMESTAMP_HOUR + 12);
		expect(t12HrAgoDT.hour).toBe(TIMESTAMP_HOUR);
		expect(t24HrAgoDT.day).toBe(t12HrAgoDT.day - 1);
	}
});
