import { BodyResponseCallback } from 'google-auth-library/build/src/transporters';

export interface DriveRequest {}

export interface GoogleDrive {
   constructor(options?: DriveOptions): GoogleDrive;

   files: {
      get(
         params: GetParams,
         options: DriveOptions | FileCallback,
         callback?: FileCallback
      ): void;

      list(
         params: ListParams,
         options: DriveOptions | FileCallback,
         callback?: FileCallback
      ): void;
   };
}

type FileCallback = BodyResponseCallback<any>;

export interface GetParams {
   fileId: string;
}

export interface ListParams {}

export interface DriveOptions {
   url?: string;
   method?: string;
   encoding?: string;
}
