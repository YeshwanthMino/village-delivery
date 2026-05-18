import { NativeModules, Platform } from 'react-native';

const { PhoneHint } = NativeModules;

export const requestPhoneNumber = async (): Promise<string | null> => {
  if (Platform.OS !== 'android' || !PhoneHint) return null;
  try {
    const raw: string = await PhoneHint.requestPhoneNumber();
    // Strip country code prefix (+91) and non-digit chars, keep 10 digits
    return raw.replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10);
  } catch {
    return null;
  }
};
