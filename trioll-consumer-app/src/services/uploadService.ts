import { Config } from '../config/environments';
import { safeAuthService } from './auth/safeAuthService';
import { fetchAuthSession } from 'aws-amplify/auth';
import { uploadData } from 'aws-amplify/storage';

class UploadService {
  // Use Amplify Storage instead of direct S3 client for better React Native compatibility

  async uploadProfileImage(uri: string, type: 'avatar' | 'cover'): Promise<string> {
    try {
      // Get current user ID
      const userId = await safeAuthService.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Create a scalable folder structure
      const userIdPrefix = userId.substring(0, 2);
      const userIdMiddle = userId.substring(2, 4);
      
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const fileExtension = this.getFileExtension(uri);
      
      // Structure: profile-images/{prefix}/{middle}/{userId}/{type}/{type}-{timestamp}.{ext}
      const key = `profile-images/${userIdPrefix}/${userIdMiddle}/${userId}/${type}/${type}-${timestamp}${fileExtension}`;

      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Use Amplify Storage to upload
      const result = await uploadData({
        key,
        data: blob,
        options: {
          contentType: this.getContentType(fileExtension),
          metadata: {
            userId,
            uploadType: type,
            uploadedAt: new Date().toISOString(),
            userType: userId.startsWith('guest') ? 'guest' : 'authenticated',
          },
        }
      }).result;

      // Return the public URL
      const publicUrl = `https://${Config.AWS.S3_UPLOADS_BUCKET}.s3.${Config.AWS.REGION}.amazonaws.com/${key}`;
      return publicUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  // For local storage fallback
  async saveImageLocally(uri: string, type: 'avatar' | 'cover'): Promise<string> {
    // For now, just return the local URI
    // In production, you might want to use expo-file-system to copy to a permanent location
    return uri;
  }

  // Helper method to get file extension
  private getFileExtension(uri: string): string {
    const match = uri.match(/\.([^.]+)$/);
    if (match) {
      return `.${match[1]}`;
    }
    // Default to .jpg if no extension found
    return '.jpg';
  }

  // Helper method to get content type
  private getContentType(extension: string): string {
    const types: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return types[extension.toLowerCase()] || 'image/jpeg';
  }

  // Method to delete old profile images (optional cleanup)
  async deleteOldProfileImage(oldUrl: string): Promise<void> {
    try {
      // Extract the key from the URL
      const urlParts = oldUrl.split('.amazonaws.com/');
      if (urlParts.length !== 2) return;
      
      const key = decodeURIComponent(urlParts[1]);
      
      // Use Amplify Storage to delete
      const { remove } = await import('aws-amplify/storage');
      await remove({ key });
    } catch (error) {
      // Ignore deletion errors
      console.warn('Failed to delete old image:', error);
    }
  }
}

export const uploadService = new UploadService();