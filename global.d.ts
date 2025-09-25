declare module 'expo-document-picker' {
  export interface DocumentPickerAsset {
    uri: string;
    name?: string;
    size?: number;
    mimeType?: string | null;
  }

  export interface DocumentPickerResult {
    type: 'cancel' | 'success';
    assets?: DocumentPickerAsset[];
  }

  export function getDocumentAsync(options?: Record<string, unknown>): Promise<DocumentPickerResult>;
}

declare module 'expo-image-picker' {
  export enum MediaTypeOptions {
    Images = 'Images',
    Videos = 'Videos',
    All = 'All',
  }

  export interface ImagePickerAsset {
    uri: string;
    width?: number;
    height?: number;
    type?: string | null;
    fileName?: string | null;
  }

  export interface ImagePickerResult {
    canceled: boolean;
    assets?: ImagePickerAsset[];
  }

  export function requestCameraPermissionsAsync(): Promise<{ status: 'granted' | 'denied' }>;
  export function requestMediaLibraryPermissionsAsync(): Promise<{ status: 'granted' | 'denied' }>;
  export function launchImageLibraryAsync(options?: Record<string, unknown>): Promise<ImagePickerResult>;
  export function launchCameraAsync(options?: Record<string, unknown>): Promise<ImagePickerResult>;
}
