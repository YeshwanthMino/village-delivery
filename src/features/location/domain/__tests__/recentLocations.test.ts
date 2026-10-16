import { isActiveRecentLocation, sameRecentLocation } from '../recentLocations';

const errepalli = {
  villageId: 'unknown', storeId: 's1', villageName: 'Errepalli',
  label: 'Errepalli', savedAt: 1,
};
const mittoor = {
  villageId: 'unknown', storeId: 's1', villageName: 'Mittoor',
  label: 'Mittoor', savedAt: 2,
};

it('keeps distinct recent villages when the API omitted both village IDs', () => {
  expect(sameRecentLocation(errepalli, mittoor)).toBe(false);
  expect(sameRecentLocation(errepalli, { ...errepalli, savedAt: 3 })).toBe(true);
});

it('marks only the selected village active when recent villages share a store', () => {
  const selected = { id: 'v2', name: 'Mittoor', storeId: 's1' };
  expect(isActiveRecentLocation(mittoor, selected)).toBe(true);
  expect(isActiveRecentLocation(errepalli, selected)).toBe(false);
});
