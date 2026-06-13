/**
 * uploadsService — centralises all file upload endpoints
 *
 * POST /uploads/avatar        → profile avatar  (any authenticated user)
 * POST /uploads/video         → exercise video  (provider only)
 * POST /uploads/thumbnail     → exercise thumb  (provider only)
 * POST /uploads/report-photo  → report photo    (patient / provider)
 *
 * Note: avatar / video / thumbnail are also called directly from
 * profileService and exercisesService — kept there for proximity.
 * This service is the single source of truth for the raw upload helpers.
 */
import api from './api'

export interface UploadResult {
  key: string
  url: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap(d: any): UploadResult {
  const r = d?.data ?? d
  return { key: r?.key ?? '', url: r?.url ?? '' }
}

async function upload(endpoint: string, file: File): Promise<UploadResult> {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await api.post(endpoint, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return unwrap(data)
}

export const uploadsService = {
  /** POST /uploads/avatar — profile photo for any authenticated user */
  uploadAvatar(file: File): Promise<UploadResult> {
    return upload('/uploads/avatar', file)
  },

  /** POST /uploads/video — exercise video (provider only) */
  uploadVideo(file: File): Promise<UploadResult> {
    return upload('/uploads/video', file)
  },

  /** POST /uploads/thumbnail — exercise thumbnail image (provider only) */
  uploadThumbnail(file: File): Promise<UploadResult> {
    return upload('/uploads/thumbnail', file)
  },

  /** POST /uploads/report-photo — photo attachment for a symptom report */
  uploadReportPhoto(file: File): Promise<UploadResult> {
    return upload('/uploads/report-photo', file)
  },
}
