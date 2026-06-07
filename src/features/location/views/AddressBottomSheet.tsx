// src/features/location/views/AddressBottomSheet.tsx

import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { VillageBottomSheet } from '@/src/shared/components';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { AddressTag } from '../domain/models';
import { useAddressBookViewModel } from '../viewmodel/useAddressBookViewModel';
import { AddressRow } from './components/AddressRow';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const AddressBottomSheet = ({ visible, onClose }: Props) => {
  const { t } = useTranslation();
  const router = useRouter();
  const vm = useAddressBookViewModel();

  const tagLabel = (tag: AddressTag) =>
    tag === 'home' ? t('tag_home') : tag === 'work' ? t('tag_work') : t('tag_other');

  return (
    <VillageBottomSheet visible={visible} onClose={onClose}>
      <View className="px-5 pb-4">
        <Text className="text-slate-900 font-bold text-lg mb-4">{t('select_delivery_address')}</Text>

        {vm.loading ? (
          <View className="py-8 items-center"><ActivityIndicator color="#16a34a" /></View>
        ) : vm.addresses.length === 0 ? (
          <Text className="text-slate-500 text-base py-6 text-center">{t('no_saved_addresses')}</Text>
        ) : (
          vm.addresses.map((a) => (
            <AddressRow
              key={a.id}
              address={a}
              tagLabel={tagLabel(a.tag)}
              selected={a.id === vm.selectedAddressId}
              onSelect={() => { vm.select(a.id); onClose(); }}
              onEdit={() => { onClose(); router.push(`/address/add?id=${a.id}` as any); }}
              onDelete={() => vm.remove(a.id)}
            />
          ))
        )}

        <TouchableOpacity
          onPress={() => { onClose(); router.push('/address/add' as any); }}
          className="bg-green-600 rounded-2xl py-4 items-center mt-2"
        >
          <Text className="text-white font-bold text-base">{t('add_new_address')}</Text>
        </TouchableOpacity>
      </View>
    </VillageBottomSheet>
  );
};
