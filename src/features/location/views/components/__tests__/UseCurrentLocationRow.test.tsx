import { fireEvent, render } from '@testing-library/react-native';
import { UseCurrentLocationRow } from '../UseCurrentLocationRow';

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

it.each(['undetermined', 'denied', 'granted'] as const)(
  'requests location when the %s row is tapped',
  (permission) => {
    const onPress = jest.fn();
    const screen = render(<UseCurrentLocationRow permission={permission} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  },
);

it('does not request location while a permission or GPS request is running', () => {
  const onPress = jest.fn();
  const screen = render(<UseCurrentLocationRow permission="undetermined" loading onPress={onPress} />);

  fireEvent.press(screen.getByRole('button'));

  expect(onPress).not.toHaveBeenCalled();
});
