import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Image } from 'expo-image';
import { ScrollView, TouchableOpacity } from 'react-native';
import { HomeBannerCarousel } from '../HomeBannerCarousel';
import { BannerSection } from '../../../../data/homeLayout.types';

jest.mock('@/src/shared/hooks/useScreenActive', () => ({ useScreenActive: () => true }));

const section: BannerSection = {
  id: 'banners', kind: 'banner', title: '', hideTitle: true,
  height: 180, autoScroll: true, autoPlayDelay: 4000, itemsPerSlide: 1,
  slides: [
    { id: 'a', title: 'Sale A', imageUrl: 'a.jpg' },
    { id: 'b', title: 'Sale B', imageUrl: 'b.jpg' },
    { id: 'c', title: 'Sale C', imageUrl: 'c.jpg' },
  ],
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('keeps the track height stable across mixed image sizes and swipes without cropping artwork', () => {
  const { UNSAFE_getAllByType, UNSAFE_getByType } = render(<HomeBannerCarousel section={section} onPressSlide={jest.fn()} />);
  const images = UNSAFE_getAllByType(Image);
  fireEvent(images[1], 'load', { source: { width: 1200, height: 600 } });
  const card = UNSAFE_getAllByType(TouchableOpacity)[1];
  const height = card.props.style.height;
  expect(height).toBe(Math.round(card.props.style.width / 2));
  fireEvent(images[2], 'load', { source: { width: 600, height: 1200 } });
  const scroll = UNSAFE_getByType(ScrollView);
  fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { x: scroll.props.snapToInterval * 2 } } });
  fireEvent(scroll, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: scroll.props.snapToInterval * 2 } } });
  UNSAFE_getAllByType(TouchableOpacity).forEach(item => expect(item.props.style.height).toBe(height));
  images.forEach(image => expect(image.props.contentFit).toBe('contain'));
});

it('provides enough trailing space to snap every card and preserves navigation from loop copies', () => {
  const onPressSlide = jest.fn();
  const { UNSAFE_getAllByType, UNSAFE_getByType } = render(<HomeBannerCarousel section={section} onPressSlide={onPressSlide} />);
  const scroll = UNSAFE_getByType(ScrollView);
  expect(scroll.props.contentContainerStyle.paddingRight).toBe(40);
  expect(scroll.props.contentOffset.x).toBe(scroll.props.snapToInterval);
  expect(scroll.props.disableIntervalMomentum).toBeUndefined();
  const cards = UNSAFE_getAllByType(TouchableOpacity);
  fireEvent.press(cards[1]);
  fireEvent.press(cards[4]);
  expect(onPressSlide.mock.calls).toEqual([[section.slides[0]], [section.slides[0]]]);
});

it('uses a fresh aspect ratio when artwork changes and handles one or zero banners', () => {
  const { UNSAFE_getAllByType, UNSAFE_getByType, rerender, toJSON } = render(<HomeBannerCarousel section={section} onPressSlide={jest.fn()} />);
  fireEvent(UNSAFE_getAllByType(Image)[1], 'load', { source: { width: 1200, height: 600 } });
  const updated = { ...section, slides: [{ ...section.slides[0], imageUrl: 'new.jpg' }] };
  rerender(<HomeBannerCarousel section={updated} onPressSlide={jest.fn()} />);
  expect(UNSAFE_getAllByType(Image)).toHaveLength(1);
  expect(UNSAFE_getAllByType(TouchableOpacity)[0].props.style.height).toBe(180);
  expect(UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(false);
  expect(UNSAFE_getByType(ScrollView).props.contentContainerStyle.paddingRight).toBe(16);
  // Allow the image mock's own timers to drain; a single banner must not autoplay.
  act(() => jest.advanceTimersByTime(10000));
  expect(jest.getTimerCount()).toBe(0);
  rerender(<HomeBannerCarousel section={{ ...section, slides: [] }} onPressSlide={jest.fn()} />);
  expect(toJSON()).toBeNull();
});
