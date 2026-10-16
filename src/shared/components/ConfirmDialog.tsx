// Centered confirmation dialog used for destructive / irreversible actions
// (sign out, delete address). Replaces the bare native Alert.alert so the
// prompt matches the app's rounded visual language.

import { X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useScreenFocused } from '@/src/shared/hooks/useScreenActive';

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
}: ConfirmDialogProps) => {
  const focused = useScreenFocused();
  const [mayPresent, setMayPresent] = useState(true);
  const shown = visible && focused && mayPresent;
  const wasShown = useRef(false);
  const awaitingDismiss = useRef(false);
  const cancelled = useRef(false);
  const confirmed = useRef(false);
  const onCancelRef = useRef(onCancel);
  const onConfirmRef = useRef(onConfirm);
  onCancelRef.current = onCancel;
  onConfirmRef.current = onConfirm;

  const cancel = useCallback(() => {
    if (!shown || cancelled.current) return;
    cancelled.current = true;
    onCancelRef.current();
  }, [shown]);

  useEffect(() => {
    if (shown) {
      cancelled.current = false;
      confirmed.current = false;
    }
    if (wasShown.current && !shown) {
      awaitingDismiss.current = true;
      if (Platform.OS === 'ios') setMayPresent(false);
    }
    wasShown.current = shown;
  }, [shown]);
  useEffect(() => {
    if (visible && !focused && !cancelled.current) {
      cancelled.current = true;
      onCancelRef.current();
    }
  }, [visible, focused]);

  const confirm = useCallback(() => {
    if (!shown || confirmed.current || cancelled.current) return;
    confirmed.current = true;
    onConfirmRef.current();
  }, [shown]);

  const handleDismiss = useCallback(() => {
    if (!awaitingDismiss.current) return;
    awaitingDismiss.current = false;
    if (Platform.OS === 'ios') setMayPresent(true);
  }, []);

  return (
  <Modal visible={shown} transparent animationType="none" onRequestClose={cancel} onDismiss={handleDismiss} statusBarTranslucent>
    {shown ? <View className="flex-1 items-center justify-center px-8" pointerEvents="box-none">
      <Pressable onPress={cancel} style={StyleSheet.absoluteFillObject} className="bg-black/50" accessibilityRole="button" accessibilityLabel={cancelLabel} />
      <View
        className="w-full bg-white rounded-3xl px-5 pt-5 pb-5"
        style={{ maxWidth: 360, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12 }}
      >
        <View className="flex-row items-start">
          <Text className="flex-1 text-slate-900 font-black text-xl pr-3">{title}</Text>
          <TouchableOpacity
            onPress={cancel}
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
            onPress={cancel}
            activeOpacity={0.7}
            accessibilityRole="button"
            className="flex-1 items-center justify-center rounded-xl py-3.5 bg-slate-100"
          >
            <Text className="text-slate-700 font-bold text-[15px]">{cancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={confirm}
            activeOpacity={0.85}
            accessibilityRole="button"
            className={`flex-1 items-center justify-center rounded-xl py-3.5 ${TONE[tone]}`}
          >
            <Text className="text-white font-extrabold text-[15px]">{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View> : null}
  </Modal>
  );
};
