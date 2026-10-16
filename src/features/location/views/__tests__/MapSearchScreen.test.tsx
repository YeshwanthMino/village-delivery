// src/features/location/views/__tests__/MapSearchScreen.test.tsx

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { MapSearchScreen } from '../MapSearchScreen';
import { useVillageSearchQuery } from '../../data/queries/useVillageSearchQuery';
import type { Village } from '../../domain/models';

// jest.mock factories are hoisted, so these must carry the `mock` prefix.
const mockDismissTo = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

let mockParams: Record<string, string> = {};
let mockCanGoBack = true;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    dismissTo: (...args: unknown[]) => mockDismissTo(...args),
    back: () => mockBack(),
    replace: (...args: unknown[]) => mockReplace(...args),
    canGoBack: () => mockCanGoBack,
  }),
}));

jest.mock('../../data/queries/useVillageSearchQuery', () => ({
  useVillageSearchQuery: jest.fn(),
}));

const mockedQuery = useVillageSearchQuery as jest.MockedFunction<typeof useVillageSearchQuery>;

const village = (id: string, latitude?: number, longitude?: number): Village => ({
  id,
  name: `Village ${id}`,
  latitude,
  longitude,
});

/** Stand-in for the react-query result the hook consumes. */
const queryResult = (data: Village[], over: Partial<{ isFetching: boolean; isError: boolean }> = {}) =>
  ({ data, isFetching: false, isError: false, ...over }) as ReturnType<typeof useVillageSearchQuery>;

/** Type into the field and let the 500ms debounce elapse. */
const search = (term: string) => {
  fireEvent.changeText(screen.getByPlaceholderText('Search your village'), term);
  act(() => {
    jest.advanceTimersByTime(500);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  mockDismissTo.mockClear();
  mockBack.mockClear();
  mockReplace.mockClear();
  mockParams = {};
  mockCanGoBack = true;
});

afterEach(() => jest.useRealTimers());

describe('MapSearchScreen', () => {
  it('renders the search-only screen under the "Search location" title', () => {
    mockedQuery.mockReturnValue(queryResult([]));
    render(<MapSearchScreen />);

    expect(screen.getByText('Search location')).toBeTruthy();
    // The sections that belong to the full location screen must not appear here.
    expect(screen.queryByText('Use my Current Location')).toBeNull();
    expect(screen.queryByText('Set location on map')).toBeNull();
    expect(screen.queryByText('Recent locations')).toBeNull();
  });

  it('lists only results that carry coordinates', () => {
    mockedQuery.mockReturnValue(
      queryResult([village('a', 13.36, 79.02), village('b'), village('c', 12.9, 77.5)]),
    );
    render(<MapSearchScreen />);

    search('kan');

    expect(screen.getByText('Village a')).toBeTruthy();
    expect(screen.getByText('Village c')).toBeTruthy();
    expect(screen.queryByText('Village b')).toBeNull();
  });

  it('shows the empty state when every result was filtered out', () => {
    mockedQuery.mockReturnValue(queryResult([village('b'), village('d')]));
    render(<MapSearchScreen />);

    search('kan');

    expect(screen.getByText('No villages found for “kan”')).toBeTruthy();
  });

  it('pops back to the map with the selected coordinates', () => {
    mockedQuery.mockReturnValue(queryResult([village('a', 13.36, 79.02)]));
    render(<MapSearchScreen />);

    search('kan');
    fireEvent.press(screen.getByText('Village a'));

    expect(mockDismissTo).toHaveBeenCalledTimes(1);
    const [href] = mockDismissTo.mock.calls[0] as [{ pathname: string; params: Record<string, string> }];
    expect(href.pathname).toBe('/location/map');
    expect(href.params.lat).toBe('13.36');
    expect(href.params.lng).toBe('79.02');
  });

  it('pops back to Add Address when it opened the search', () => {
    mockParams = { returnTo: '/address/add' };
    mockedQuery.mockReturnValue(queryResult([village('a', 13.36, 79.02)]));
    render(<MapSearchScreen />);

    search('kan');
    fireEvent.press(screen.getByText('Village a'));

    const [href] = mockDismissTo.mock.calls[0] as [{ pathname: string }];
    expect(href.pathname).toBe('/address/add');
  });

  it('preserves profile address-management mode on selection and Back without history', () => {
    mockParams = { returnTo: '/address/add', manage: '1' };
    mockedQuery.mockReturnValue(queryResult([village('a', 13.36, 79.02)]));
    const view = render(<MapSearchScreen />);
    search('kan');
    fireEvent.press(screen.getByText('Village a'));
    expect(mockDismissTo).toHaveBeenCalledWith(expect.objectContaining({
      pathname: '/address/add', params: expect.objectContaining({ manage: '1' }),
    }));
    view.unmount();
    mockCanGoBack = false;
    render(<MapSearchScreen />);
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/address/add', params: { manage: '1' } });
  });

  it('ignores an unknown returnTo and falls back to the home map', () => {
    mockParams = { returnTo: '/somewhere/else' };
    mockedQuery.mockReturnValue(queryResult([village('a', 13.36, 79.02)]));
    render(<MapSearchScreen />);

    search('kan');
    fireEvent.press(screen.getByText('Village a'));

    const [href] = mockDismissTo.mock.calls[0] as [{ pathname: string }];
    expect(href.pathname).toBe('/location/map');
  });

  it('makes each pick distinct so re-picking the same village still recenters', () => {
    mockedQuery.mockReturnValue(queryResult([village('a', 13.36, 79.02)]));
    const view = render(<MapSearchScreen />);

    search('kan');
    fireEvent.press(screen.getByText('Village a'));
    view.unmount(); // Return to the map, then open a new search screen.
    act(() => {
      jest.advanceTimersByTime(5);
    });
    render(<MapSearchScreen />);
    search('kan');
    fireEvent.press(screen.getByText('Village a'));

    const [first] = mockDismissTo.mock.calls[0] as [{ params: Record<string, string> }];
    const [second] = mockDismissTo.mock.calls[1] as [{ params: Record<string, string> }];
    expect(second.params.at).not.toBe(first.params.at);
  });

  it('navigates only once when results are tapped repeatedly', () => {
    mockedQuery.mockReturnValue(queryResult([village('a', 13.36, 79.02), village('b', 12, 78)]));
    render(<MapSearchScreen />);
    search('kan');
    fireEvent.press(screen.getByText('Village a'));
    fireEvent.press(screen.getByText('Village a'));
    fireEvent.press(screen.getByText('Village b'));
    expect(mockDismissTo).toHaveBeenCalledTimes(1);
  });

  it('does not search until the query is long enough', () => {
    mockedQuery.mockReturnValue(queryResult([village('a', 13.36, 79.02)]));
    render(<MapSearchScreen />);

    search('ka');

    expect(screen.queryByText('Search results')).toBeNull();
    expect(screen.queryByText('Village a')).toBeNull();
  });

  it('surfaces a search failure', () => {
    mockedQuery.mockReturnValue(queryResult([], { isError: true }));
    render(<MapSearchScreen />);

    search('kan');

    expect(screen.getByText("Couldn't search. Try again.")).toBeTruthy();
  });
});
