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

/** Shrinks the photo and re-saves it as JPEG, which also turns iPhone HEIC photos into something the API reads. */
export async function toUploadJpeg(asset: ImagePicker.ImagePickerAsset): Promise<Uint8Array<ArrayBuffer>> {
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_SIDE) {
    context.resize(asset.width >= asset.height ? { width: MAX_SIDE, height: null } : { width: null, height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
  return new File(saved.uri).bytes();
}
