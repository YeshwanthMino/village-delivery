// src/features/storeConfig/views/StoreClosedSheet.tsx
//
// Explains why delivery is delayed when the store is not serving, and when the
// order will be processed. Shown on app open (home) and before placing an
// order (cart). Copy is chosen per StoreStatus so each scenario shows only
// the timing lines relevant to it — never a contradictory pair.

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Clock, Store, Truck } from 'lucide-react-native';
import { VillageBottomSheet } from '@/src/shared/components/VillageBottomSheet';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate, interpolateVars } from '@/src/base/constants/translations';
import { WEEKDAYS, type WeeklyStoreTimings } from '../data/storeConfig.types';
import {
  OPENS_SOON_THRESHOLD_MINUTES,
  formatDateClock,
  formatDayHours,
  type NextOpening,
  type StoreStatus,
} from '../domain/storeStatus';

interface Props {
  visible: boolean;
  status: StoreStatus;
  timings: WeeklyStoreTimings | null;
  /** 'home' just informs; 'checkout' asks to confirm placing the order. */
  context: 'home' | 'checkout';
  onClose: () => void;
  onDismiss?: () => void;
  /** Checkout only: the customer accepts the delay and places the order. */
  onPlaceOrder?: () => void;
}

interface Copy {
  title: string;
  description: string;
  opensIn?: string;
  nextOpening?: string;
  hours: string[];
}

export const StoreClosedSheet = ({ visible, status, timings, context, onClose, onDismiss, onPlaceOrder }: Props) => {
  const { t } = useTranslation();

  const when = (next: NextOpening): string => {
    const time = formatDateClock(next.at);
    if (next.daysAhead === 0) return interpolateVars(t('store_when_today'), { time });
    if (next.daysAhead === 1) return interpolateVars(t('store_when_tomorrow'), { time });
    const day = t(`weekday_${WEEKDAYS[next.at.getDay()]}`);
    return interpolateVars(t('store_when_day'), { day, time });
  };

  const hoursOn = (date: Date) => (timings ? formatDayHours(timings, date) : []);

  const copy = ((): Copy | null => {
    switch (status.kind) {
      case 'not_yet_open': {
        const soon = status.nextOpening.minutesUntil <= OPENS_SOON_THRESHOLD_MINUTES;
        return {
          title: t(soon ? 'store_processed_soon_title' : 'store_opens_soon_title'),
          description: interpolateVars(t('store_not_yet_open_desc'), { when: when(status.nextOpening) }),
          opensIn: soon ? interpolate(t('store_opens_in'), Math.max(1, status.nextOpening.minutesUntil)) : undefined,
          hours: hoursOn(status.nextOpening.at),
        };
      }
      case 'between_shifts':
        return {
          title: t('store_temp_closed_title'),
          description: interpolateVars(t('store_between_shifts_desc'), { when: when(status.nextOpening) }),
          hours: hoursOn(status.nextOpening.at),
        };
      case 'closed': {
        const tomorrow = status.nextOpening.daysAhead === 1;
        const whenText = when(status.nextOpening);
        return {
          title: t('store_closed_title'),
          description: interpolateVars(t(tomorrow ? 'store_closed_tomorrow_desc' : 'store_closed_later_desc'), { when: whenText }),
          nextOpening: interpolateVars(t('store_next_opening'), { when: whenText }),
          // Hours for a day several days out read as noise next to "Next opening".
          hours: tomorrow ? hoursOn(status.nextOpening.at) : [],
        };
      }
      case 'closing_soon':
        return {
          title: t('store_closing_soon_title'),
          description: status.nextOpening
            ? interpolateVars(t('store_closing_soon_desc'), {
                close: formatDateClock(status.closesAt),
                when: when(status.nextOpening),
              })
            : '',
          hours: hoursOn(status.closesAt),
        };
      default:
        return null;
    }
  })();

  return (
    <VillageBottomSheet visible={visible && !!copy} onClose={onClose} onDismiss={onDismiss}>
      {copy ? (
      <View className="px-5 pb-4">
        <View className="items-center py-3">
          <View className="w-16 h-16 rounded-full bg-amber-50 items-center justify-center">
            <Store size={30} color="#d97706" />
          </View>
        </View>
        <Text className="text-slate-900 font-bold text-xl text-center">{copy.title}</Text>
        {!!copy.description && (
          <Text className="text-slate-500 text-base text-center mt-2 leading-6">{copy.description}</Text>
        )}

        <View className="bg-slate-50 rounded-2xl p-4 mt-4 gap-3">
          {!!copy.opensIn && <InfoRow icon="clock" text={copy.opensIn} strong />}
          {!!copy.nextOpening && <InfoRow icon="clock" text={copy.nextOpening} strong />}
          {copy.hours.length > 0 && (
            <InfoRow icon="clock" text={`${t('store_hours')}: ${copy.hours.join(', ')}`} />
          )}
          <InfoRow icon="truck" text={t('store_delivery_after_open')} />
        </View>

        {context === 'checkout' ? (
          <>
            <TouchableOpacity onPress={onPlaceOrder} className="bg-green-600 rounded-2xl py-4 items-center mt-5">
              <Text className="text-white font-bold text-base">{t('store_place_order')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} className="py-3.5 items-center mt-1">
              <Text className="text-slate-500 font-semibold text-base">{t('store_go_back')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={onClose} className="bg-green-600 rounded-2xl py-4 items-center mt-5">
            <Text className="text-white font-bold text-base">{t('store_continue_shopping')}</Text>
          </TouchableOpacity>
        )}
      </View>
      ) : null}
    </VillageBottomSheet>
  );
};

const InfoRow = ({ icon, text, strong }: { icon: 'clock' | 'truck'; text: string; strong?: boolean }) => (
  <View className="flex-row items-start gap-2.5">
    {icon === 'clock' ? <Clock size={18} color="#475569" /> : <Truck size={18} color="#475569" />}
    <Text className={`flex-1 text-sm leading-5 ${strong ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>
      {text}
    </Text>
  </View>
);
