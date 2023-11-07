import { DateTime } from 'luxon';
import { TIMEZONE, TIMESTAMP_HOUR, TIMESTAMP_MINUTE } from './constants';

export const createTimeStampData = () => {
	const currentTime = DateTime.now().setZone(TIMEZONE).set({
		minute: TIMESTAMP_MINUTE,
		second: 0,
		millisecond: 0,
	});
	let t24HrAgo: DateTime, t12HrAgo: DateTime;
	if (currentTime.hour < 12) {
		// Before noon
		t24HrAgo = currentTime.minus({ days: 1 }).set({
			hour: TIMESTAMP_HOUR,
		});
		t12HrAgo = currentTime.minus({ days: 1 }).set({
			hour: TIMESTAMP_HOUR + 12,
		});
	} else {
		t24HrAgo = currentTime.minus({ days: 1 }).set({
			hour: TIMESTAMP_HOUR + 12,
		});
		t12HrAgo = currentTime.set({
			hour: TIMESTAMP_HOUR,
		});
	}
	const returnData = {
		t24HrAgo: t24HrAgo.toSeconds(),
		t12HrAgo: t12HrAgo.toSeconds(),
	};
	console.log('Created timestamp for:', returnData);
	console.log(
		'Timestamp will be from',
		t24HrAgo.toString(),
		'to',
		t12HrAgo.toString()
	);
	return returnData;
};
