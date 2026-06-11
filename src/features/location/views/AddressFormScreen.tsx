// src/features/location/views/AddressFormScreen.tsx

import React from 'react';
import { ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { AddressTag } from '../domain/models';
import { useAddressFormViewModel } from '../viewmodel/useAddressFormViewModel';
import { TagSelector } from './components/TagSelector';

export const AddressFormScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const vm = useAddressFormViewModel(id);

  const tagLabels: Record<AddressTag, string> = {
    home: t('tag_home'),
    work: t('tag_work'),
    other: t('tag_other'),
  };

  const onSave = async () => {
    const ok = await vm.save();
    if (ok) router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center px-4 py-3 border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft size={24} color="#334155" /></TouchableOpacity>
        <Text className="text-slate-900 font-bold text-lg ml-2">{t('add_new_address')}</Text>
      </View>

      <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
        {/* Village chip from find-by-location */}
        <View className="flex-row items-center bg-green-50 rounded-2xl px-4 py-3 mt-4">
          <MapPin size={18} color="#16a34a" />
          <Text className="ml-2 text-green-800 font-semibold text-sm" numberOfLines={1}>
            {vm.villageName}{vm.villagePincode ? ` · ${vm.villagePincode}` : ''}
          </Text>
        </View>

        <TextInput
          value={vm.form.addressLine1}
          onChangeText={(v) => vm.set('addressLine1', v)}
          placeholder={t('field_house_street')}
          placeholderTextColor="#94a3b8"
          className="border border-slate-200 rounded-2xl px-4 py-3.5 mt-4 text-slate-900 text-base"
        />
        {vm.errors.addressLine1 ? <Text className="text-red-500 text-xs mt-1 ml-1">{t(vm.errors.addressLine1)}</Text> : null}

        <TextInput
          value={vm.form.addressLine2}
          onChangeText={(v) => vm.set('addressLine2', v)}
          placeholder={t('field_area_optional')}
          placeholderTextColor="#94a3b8"
          className="border border-slate-200 rounded-2xl px-4 py-3.5 mt-3 text-slate-900 text-base"
        />

        <TextInput
          value={vm.form.landmark}
          onChangeText={(v) => vm.set('landmark', v)}
          placeholder={t('field_landmark')}
          placeholderTextColor="#94a3b8"
          className="border border-slate-200 rounded-2xl px-4 py-3.5 mt-3 text-slate-900 text-base"
        />

        <TextInput
          value={vm.form.pincode}
          onChangeText={(v) => vm.set('pincode', v)}
          placeholder={t('field_pincode')}
          placeholderTextColor="#94a3b8"
          keyboardType="number-pad"
          maxLength={6}
          className="border border-slate-200 rounded-2xl px-4 py-3.5 mt-3 text-slate-900 text-base"
        />
        {vm.errors.pincode ? <Text className="text-red-500 text-xs mt-1 ml-1">{t(vm.errors.pincode)}</Text> : null}

        <Text className="text-slate-700 font-semibold text-sm mt-5 mb-2">{tagLabels.home} / {tagLabels.work} / {tagLabels.other}</Text>
        <TagSelector value={vm.form.tag} onChange={(tag) => vm.set('tag', tag)} labels={tagLabels} />

        <View className="flex-row items-center justify-between mt-5">
          <Text className="text-slate-700 font-semibold text-base">{t('set_as_default')}</Text>
          <Switch
            value={vm.form.isDefault}
            onValueChange={(v) => vm.set('isDefault', v)}
            trackColor={{ true: '#16a34a', false: '#cbd5e1' }}
          />
        </View>
      </ScrollView>

      <View className="px-5 pt-3 border-t border-slate-100" style={{ paddingBottom: insets.bottom + 12 }}>
        <TouchableOpacity
          onPress={onSave}
          disabled={vm.saving}
          className="bg-green-600 rounded-2xl py-4 items-center"
        >
          <Text className="text-white font-bold text-base">{t('save_address')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
