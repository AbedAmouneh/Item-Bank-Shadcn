import { useState } from 'react';

import { uploadImage, uploadImageBase64 } from '@item-bank/api';

/**
 * Shared upload hook for question editors that have image fields.
 *
 * Manages upload lifecycle state (`isUploading`, `error`) while keeping the
 * resulting URL stateless — callers are responsible for storing the URL in
 * their own form state after a successful upload.
 *
 * Both functions re-throw on failure so callers can use try/catch if they
 * need imperative control, in addition to reading `error` for reactive UI.
 */
export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload a File object via multipart/form-data.
   *
   * @param file - The image File selected by the user.
   * @returns    The CDN URL of the uploaded image.
   */
  async function uploadFile(file: File): Promise<string> {
    setIsUploading(true);
    setError(null);
    try {
      const { url } = await uploadImage(file);
      return url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image upload failed';
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }

  /**
   * Upload a base64-encoded image string.
   *
   * @param data     - The base64-encoded image data (without a data-URL prefix).
   * @param mimeType - The MIME type of the image (e.g. "image/png").
   * @returns        The CDN URL of the uploaded image.
   */
  async function uploadBase64(data: string, mimeType: string): Promise<string> {
    setIsUploading(true);
    setError(null);
    try {
      const { url } = await uploadImageBase64(data, mimeType);
      return url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image upload failed';
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }

  return { isUploading, error, uploadFile, uploadBase64 };
}
