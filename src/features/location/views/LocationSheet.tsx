// src/features/location/views/LocationSheet.tsx
//
// Change-location picker (Zepto / Blinkit style), shown when a location is set.
// GPS tile + recent locations.

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Check, MapPin, Navigation, X } from 'lucide-react-native';
import { VillageBottomSheet } from '@/src/shared/components';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useLocationViewModel } from '../viewmodel/useLocationViewModel';
import { PermissionDeniedSheet } from './components/PermissionDeniedSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const LocationSheet = ({ visible, onClose }: Props) => {
  const { t } = useTranslation();
  const vm = useLocationViewModel();
  const activeStoreId = vm.village?.storeId;

  const run = async (p: Promise<boolean> | Promise<void>) => {
    const ok = await p;
    if (ok !== false) onClose();
  };

  return (
    <>
      <VillageBottomSheet visible={visible} onClose={onClose}>
        <View className="px-5 pb-6">
          <View className="flex-row items-center justify-between pb-4">
            <Text className="text-slate-900 font-extrabold text-[17px]">{t('change_delivery_location')}</Text>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
              <X size={16} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Use current GPS */}
          <TouchableOpacity
            onPress={() => run(vm.detectCurrentLocation())}
            disabled={vm.detecting}
            className="flex-row items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-3 mb-4"
          >
            <View className="w-10 h-10 rounded-xl bg-green-600 items-center justify-center">
              <Navigation size={20} color="#ffffff" />
            </View>
            <View>
              <Text className="text-green-900 font-extrabold text-[13.5px]">{t('use_current_location')}</Text>
              <Text className="text-green-700 text-[11px] mt-0.5">{t('detect_via_gps')}</Text>
            </View>
          </TouchableOpacity>

          {/* Recent locations */}
          {vm.recentLocations.length > 0 ? (
            <>
              <Text className="text-slate-400 font-extrabold text-[10px] tracking-[0.16em] uppercase mb-2">
                {t('recent_locations')}
              </Text>
              <View className="gap-2">
                {vm.recentLocations.map((r) => {
                  const active = r.storeId === activeStoreId;
                  return (
                    <TouchableOpacity
                      key={r.storeId}
                      onPress={() => run(vm.selectRecent(r))}
                      className={`flex-row items-center gap-3 p-3 rounded-2xl border ${active ? 'border-green-600 bg-green-50' : 'border-slate-200 bg-white'}`}
                    >
                      <View className={`w-9 h-9 rounded-xl items-center justify-center ${active ? 'bg-green-600' : 'bg-slate-100'}`}>
                        <MapPin size={16} color={active ? '#ffffff' : '#64748b'} />
                      </View>
                      <View className="flex-1">
                        <Text className={`font-extrabold text-[13.5px] ${active ? 'text-green-900' : 'text-slate-900'}`} numberOfLines={1}>
                          {r.villageName}
                        </Text>
                        <Text className="text-slate-500 text-[11px] mt-0.5" numberOfLines={1}>{r.label}</Text>
                      </View>
                      {active ? <Check size={16} color="#16a34a" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>
      </VillageBottomSheet>

      <PermissionDeniedSheet
        visible={vm.blocked}
        onClose={vm.dismissBlocked}
        onGoToSettings={vm.openSettings}
      />
    </>
  );
};
