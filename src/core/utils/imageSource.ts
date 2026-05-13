/**
 * ImageSource Utility - Converts ImageSource type to React Native Image source format
 * Handles both Local and Remote image sources
 */
import { ImageSourcePropType } from 'react-native';

export type ImageSource =
  | { type: 'Remote'; url: string }
  | { type: 'Local'; name: string };

/**
 * Converts ImageSource to React Native Image source format
 * @param imageSource - The ImageSource to convert (Local or Remote)
 * @param placeholderUri - Optional placeholder URI for Local images that can't be resolved
 * @returns ImageSourcePropType compatible object for React Native Image component
 */
export function getImageSource(
  imageSource: ImageSource,
  placeholderUri?: string
): ImageSourcePropType {
  if (imageSource.type === 'Remote') {
    return { uri: imageSource.url };
  }

  // For Local images, you may need to map resource names to actual image imports
  // This is a placeholder approach - you can extend this to handle local resources
  if (placeholderUri) {
    return { uri: placeholderUri };
  }

  // Default placeholder
  return { uri: 'https://via.placeholder.com/66' };
}
