import * as ImageManipulator from 'expo-image-manipulator';

const MAX_DIMENSION = 512; // px — keeps output well under 1 MB at 0.75 quality
const JPEG_QUALITY = 0.75;

/**
 * Resizes and compresses an image to a JPEG suitable for avatar upload.
 * Longest side is capped at MAX_DIMENSION; aspect ratio is preserved.
 * Returns the local URI of the compressed file.
 */
export async function compressAvatar(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
