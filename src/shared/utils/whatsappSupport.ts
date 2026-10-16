// Opens a WhatsApp chat with the support number (Support.WHATSAPP_NUMBER).
// Prefers the native WhatsApp app and falls back to the wa.me web link.
import { Alert, Linking } from 'react-native';
import { Support } from '@/src/base/constants/AppConstants';

export async function openWhatsAppSupport(message: string): Promise<void> {
  const text = encodeURIComponent(message);
  const appUrl = `whatsapp://send?phone=${Support.WHATSAPP_NUMBER}&text=${text}`;
  const webUrl = `https://wa.me/${Support.WHATSAPP_NUMBER}?text=${text}`;
  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpen ? appUrl : webUrl);
  } catch {
    Alert.alert('Error', 'Could not open WhatsApp.');
  }
}
