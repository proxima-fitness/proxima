/* eslint-disable react-hooks/set-state-in-effect */
/**
 * @module use-supabase-upload
 *
 * Provides a React hook that combines react-dropzone's drag-and-drop file
 * selection with Supabase Storage uploads. Handles client-side validation
 * (MIME type, file size, max count), preview URL generation, and partial
 * retry logic so that only failed files are re-uploaded on subsequent attempts.
 *
 * Depends on: @/api (Supabase client), react-dropzone
 * Used by: any file-upload UI (e.g. profile photo, exercise video attachments)
 */

import { supabase } from '@/api'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type FileError, type FileRejection, useDropzone } from 'react-dropzone'

/** A `File` extended with a local object-URL preview and any validation errors from react-dropzone. */
interface IFileWithPreview extends File {
  preview?: string
  errors: readonly FileError[]
}

type TUseSupabaseUploadOptions = {
  /**
   * Name of bucket to upload files to in your Supabase project
   */
  bucketName: string
  /**
   * Folder to upload files to in the specified bucket within your Supabase project.
   *
   * Defaults to uploading files to the root of the bucket
   *
   * e.g If specified path is `test`, your file will be uploaded as `test/file_name`
   */
  path?: string
  /**
   * Allowed MIME types for each file upload (e.g `image/png`, `text/html`, etc). Wildcards are also supported (e.g `image/*`).
   *
   * Defaults to allowing uploading of all MIME types.
   */
  allowedMimeTypes?: string[]
  /**
   * Maximum upload size of each file allowed in bytes. (e.g 1000 bytes = 1 KB)
   */
  maxFileSize?: number
  /**
   * Maximum number of files allowed per upload.
   */
  maxFiles?: number
  /**
   * The number of seconds the asset is cached in the browser and in the Supabase CDN.
   *
   * This is set in the Cache-Control: max-age=<seconds> header. Defaults to 3600 seconds.
   */
  cacheControl?: number
  /**
   * When set to true, the file is overwritten if it exists.
   *
   * When set to false, an error is thrown if the object already exists. Defaults to `false`
   */
  upsert?: boolean
}

/** Convenience type exposing everything returned by {@link useSupabaseUpload}. */
type TUseSupabaseUploadReturn = ReturnType<typeof useSupabaseUpload>

/**
 * Manages file selection (via drag-and-drop) and upload to a Supabase Storage bucket.
 *
 * The hook merges react-dropzone props with upload state, so callers can spread
 * the returned object directly onto a dropzone container. It tracks per-file
 * successes and errors, and re-uploads only the failed files when called again.
 *
 * @param options - Bucket name, optional path prefix, MIME/size constraints, and Supabase upload flags.
 * @returns Dropzone props, file list with previews, upload status, and an `onUpload` trigger.
 */
const useSupabaseUpload = (options: TUseSupabaseUploadOptions) => {
  const {
    bucketName,
    path,
    allowedMimeTypes = [],
    maxFileSize = Number.POSITIVE_INFINITY,
    maxFiles = 1,
    cacheControl = 3600,
    upsert = false,
  } = options

  const [files, setFiles] = useState<IFileWithPreview[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([])
  const [successes, setSuccesses] = useState<string[]>([])

  /** True only when every selected file has been uploaded without errors. */
  const isSuccess = useMemo(() => {
    if (errors.length === 0 && successes.length === 0) {
      return false
    }
    if (errors.length === 0 && successes.length === files.length) {
      return true
    }
    return false
  }, [errors.length, successes.length, files.length])

  /**
   * Dropzone callback: merges newly dropped files into state, attaching
   * preview URLs and validation errors from react-dropzone. Duplicate
   * filenames (already in state) are silently ignored.
   */
  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const validFiles = acceptedFiles
        .filter((file) => !files.find((x) => x.name === file.name))
        .map((file) => {
          ;(file as IFileWithPreview).preview = URL.createObjectURL(file)
          ;(file as IFileWithPreview).errors = []
          return file as IFileWithPreview
        })

      const invalidFiles = fileRejections.map(({ file, errors }) => {
        ;(file as IFileWithPreview).preview = URL.createObjectURL(file)
        ;(file as IFileWithPreview).errors = errors
        return file as IFileWithPreview
      })

      const newFiles = [...files, ...validFiles, ...invalidFiles]

      setFiles(newFiles)
    },
    [files, setFiles]
  )

  const dropzoneProps = useDropzone({
    onDrop,
    noClick: true,
    accept: allowedMimeTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxFileSize,
    maxFiles: maxFiles,
    multiple: maxFiles !== 1,
  })

  /**
   * Uploads all pending files to Supabase Storage. On retry, only files that
   * previously errored (plus any not yet uploaded) are sent, enabling partial
   * failure recovery without re-uploading successes.
   */
  const onUpload = useCallback(async () => {
    setLoading(true)

    // [Joshen] This is to support handling partial successes
    // If any files didn't upload for any reason, hitting "Upload" again will only upload the files that had errors
    const filesWithErrors = errors.map((x) => x.name)
    const filesToUpload =
      filesWithErrors.length > 0
        ? [
            ...files.filter((f) => filesWithErrors.includes(f.name)),
            ...files.filter((f) => !successes.includes(f.name)),
          ]
        : files

    const responses = await Promise.all(
      filesToUpload.map(async (file) => {
        const { error } = await supabase.storage
          .from(bucketName)
          // eslint-disable-next-line no-extra-boolean-cast
          .upload(!!path ? `${path}/${file.name}` : file.name, file, {
            cacheControl: cacheControl.toString(),
            upsert,
          })
        if (error) {
          return { name: file.name, message: error.message }
        } else {
          return { name: file.name, message: undefined }
        }
      })
    )

    const responseErrors = responses.filter((x) => x.message !== undefined)
    // if there were errors previously, this function tried to upload the files again so we should clear/overwrite the existing errors.
    setErrors(responseErrors)

    const responseSuccesses = responses.filter((x) => x.message === undefined)
    const newSuccesses = Array.from(
      new Set([...successes, ...responseSuccesses.map((x) => x.name)])
    )
    setSuccesses(newSuccesses)

    setLoading(false)
  }, [errors, files, successes, bucketName, path, cacheControl, upsert])

  useEffect(() => {
    if (files.length === 0) {
      setErrors([])
    }

    // If the number of files doesn't exceed the maxFiles parameter, remove the error 'Too many files' from each file
    if (files.length <= maxFiles) {
      let changed = false
      const newFiles = files.map((file) => {
        if (file.errors.some((e) => e.code === 'too-many-files')) {
          file.errors = file.errors.filter((e) => e.code !== 'too-many-files')
          changed = true
        }
        return file
      })
      if (changed) {
        setFiles(newFiles)
      }
    }
  }, [files.length, setFiles, maxFiles, files])

  return {
    files,
    setFiles,
    successes,
    isSuccess,
    loading,
    errors,
    setErrors,
    onUpload,
    maxFileSize: maxFileSize,
    maxFiles: maxFiles,
    allowedMimeTypes,
    ...dropzoneProps,
  }
}

export { useSupabaseUpload, type TUseSupabaseUploadOptions, type TUseSupabaseUploadReturn }
