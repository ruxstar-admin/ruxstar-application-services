import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** The API stores 512 px; twice that leaves room for its crop without sending a full camera photo. */
const MAX_SIDE = 1024;

/** The system photo picker with a square crop. It needs no permission. Null when the user backs out. */
export async function pickSquarePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
  return result.canceled ? null : (result.assets[0] ?? null);
}

/**
 * Shrinks the photo and re-saves it as JPEG, which also turns iPhone HEIC photos into something the API reads.
 * With `aspect` (width / height) the middle of the photo is cut to that shape first.
 */
export async function toUploadJpeg(asset: ImagePicker.ImagePickerAsset, maxSide = MAX_SIDE, aspect?: number): Promise<Uint8Array<ArrayBuffer>> {
  const context = ImageManipulator.manipulate(asset.uri);
  let { width, height } = asset;
  if (aspect && width > 0 && height > 0 && Math.abs(width / height - aspect) > 0.01) {
    const cut = width / height > aspect ? { width: Math.round(height * aspect), height } : { width, height: Math.round(width / aspect) };
    context.crop({ originX: Math.round((width - cut.width) / 2), originY: Math.round((height - cut.height) / 2), ...cut });
    ({ width, height } = cut);
  }
  if (Math.max(width, height) > maxSide) {
    context.resize(width >= height ? { width: maxSide, height: null } : { width: null, height: maxSide });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
  return new File(saved.uri).bytes();
}
