const IMAGE_FILE_REGEX = /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif|svg|tiff?|jfif)$/i;
const PREVIEWABLE_DOC_REGEX = /\.(pdf|xlsx?|csv|docx?)$/i;

export const isImageFile = (nameOrUrl: string) => IMAGE_FILE_REGEX.test(nameOrUrl || '');
export const isPreviewableDocFile = (nameOrUrl: string) => PREVIEWABLE_DOC_REGEX.test(nameOrUrl || '');
