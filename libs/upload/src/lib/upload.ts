import {
  ResourceType,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';
import { cloudinary } from './cloudinary';

export class CloudinaryService {
  static async upload(
    buffer?: Buffer,
    folder?: string,
    maxRetries = 3
  ): Promise<UploadApiResponse | null> {
    if (!buffer) return null;

    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        return await new Promise<UploadApiResponse>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'auto', folder },
            (error, result) => {
              if (error)
                return reject(new Error('Failed to upload file to Cloudinary'));
              if (!result)
                return reject(
                  new Error('Cloudinary upload returned no result')
                );
              resolve(result);
            }
          );
          stream.end(buffer);
        });
      } catch (err) {
        attempt++;
        if (attempt >= maxRetries) throw err;
      }
    }

    return null;
  }

  static async delete(
    publicId?: string,
    resourceType: ResourceType = 'image',
    maxRetries = 3
  ): Promise<UploadApiResponse | UploadApiErrorResponse | null> {
    if (!publicId) return null;

    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        return await new Promise<UploadApiResponse | UploadApiErrorResponse>(
          (resolve, reject) => {
            cloudinary.uploader.destroy(
              publicId,
              { resource_type: resourceType },
              (error, result) => {
                if (error)
                  return reject(
                    new Error('Failed to delete file from Cloudinary')
                  );
                resolve(result);
              }
            );
          }
        );
      } catch (err) {
        attempt++;
        if (attempt >= maxRetries) throw err;
      }
    }

    return null;
  }
}
