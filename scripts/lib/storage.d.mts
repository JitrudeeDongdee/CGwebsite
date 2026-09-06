// Types for storage.mjs — see facebook.d.mts.
export const BUCKET: string
export function storageConfigured(): boolean
export function uploadCatalogImage(path: string, body: Buffer, contentType: string): Promise<string>
export function deleteCatalogImage(path: string): Promise<void>
export function contentTypeFor(file: string): string
