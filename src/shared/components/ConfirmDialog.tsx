// Centered confirmation dialog used for destructive / irreversible actions
// (sign out, delete address). Replaces the bare native Alert.alert so the
// prompt matches the app's rounded visual language.

import { X } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';

type Tone = 'danger' | 'primary';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Colours the confirm button. Defaults to `danger`. */
  tone?: Tone;
  onConfirm: () => void;
  onCancel: () => void;
}

const TONE = {
  danger:  'bg-red-600',
  primary: 'bg-green-600',
} as const;

export const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
    <Pressable onPress={onCancel} className="flex-1 bg-black/50 items-center justify-center px-8">
      {/* Stop backdrop taps from closing when interacting with the card. */}
      <Pressable
        onPress={() => {}}
        className="w-full bg-white rounded-3xl px-5 pt-5 pb-5"
        style={{ maxWidth: 360, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12 }}
      >
        <View className="flex-row items-start">
          <Text className="flex-1 text-slate-900 font-black text-xl pr-3">{title}</Text>
          <TouchableOpacity
            onPress={onCancel}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            className="w-7 h-7 items-center justify-center -mt-0.5"
          >
            <X size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {message ? (
          <Text className="text-slate-500 text-[14px] leading-5 mt-2">{message}</Text>
        ) : null}

        <View className="flex-row gap-3 mt-6">
          <TouchableOpacity
            onPress={onCancel}
            activeOpacity={0.7}
            accessibilityRole="button"
            className="flex-1 items-center justify-center rounded-xl py-3.5 bg-slate-100"
          >
            <Text className="text-slate-700 font-bold text-[15px]">{cancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onConfirm}
            activeOpacity={0.85}
            accessibilityRole="button"
            className={`flex-1 items-center justify-center rounded-xl py-3.5 ${TONE[tone]}`}
          >
            <Text className="text-white font-extrabold text-[15px]">{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);
