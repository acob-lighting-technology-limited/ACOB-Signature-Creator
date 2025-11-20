"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { convertImagesIfNeeded } from "@/lib/convert-image"

interface MediaUploadProps {
  onUpload: (files: File[], type: "image" | "video") => void
}

const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"]

function isImageFile(file: File): boolean {
  if (file.type && file.type.startsWith("image/")) return true
  const name = file.name || ""
  return /(\.(jpe?g|png|webp|gif|heic|heif|bmp|tiff?|svg))$/i.test(name)
}

function isVideoFile(file: File): boolean {
  if (file.type && ACCEPTED_VIDEO_TYPES.includes(file.type)) return true
  const name = file.name || ""
  return /(\.(mp4|mov|webm))$/i.test(name)
}

export function MediaUpload({ onUpload }: MediaUploadProps) {
  const [isConverting, setIsConverting] = useState(false)

  const handleFiles = useCallback(
    async (list: FileList | File[]) => {
      const files = Array.from(list)
      const images = files.filter((f) => isImageFile(f))
      const videos = files.filter((f) => isVideoFile(f))

      if (videos.length > 1 || (videos.length === 1 && images.length > 0)) {
        toast.error("Invalid selection", {
          description: "Upload either one video or one/more images.",
        })
        return
      }

      if (videos.length === 1) {
        onUpload([videos[0]], "video")
        return
      }

      if (images.length > 0) {
        const MAX = 50
        const selected = images.slice(0, MAX)
        if (images.length > MAX) {
          toast.message("Selection limited", {
            description: `Only the first ${MAX} images will be attached (of ${images.length}).`,
          })
        }

        try {
          setIsConverting(true)
          toast.loading("Converting images...", { id: "image-conversion" })

          // Convert HEIC and other formats if needed
          const convertedImages = await convertImagesIfNeeded(selected)

          toast.dismiss("image-conversion")
          onUpload(convertedImages, "image")
          toast.success("Images attached", {
            description: `${convertedImages.length} image${convertedImages.length === 1 ? "" : "s"} ready to preview/process.`,
          })
        } catch (error) {
          toast.dismiss("image-conversion")
          toast.error("Conversion failed", {
            description: error instanceof Error ? error.message : "Failed to convert images",
          })
        } finally {
          setIsConverting(false)
        }
        return
      }

      toast.error("Invalid file type", {
        description: "Please upload images or a single MP4/MOV/WEBM video.",
      })
    },
    [onUpload]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const { files } = e.dataTransfer
      if (files && files.length) handleFiles(files)
    },
    [handleFiles]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length) handleFiles(files)
    },
    [handleFiles]
  )

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-border hover:border-muted-foreground glass-effect relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors"
      onClick={() => !isConverting && document.getElementById("media-upload")?.click()}
    >
      <input
        id="media-upload"
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={handleChange}
        disabled={isConverting}
      />
      {isConverting ? (
        <>
          <Loader2 className="text-muted-foreground mx-auto mb-3 h-10 w-10 animate-spin" />
          <p className="text-foreground mb-1 text-sm font-medium">Converting images...</p>
          <p className="text-muted-foreground text-xs">Please wait</p>
        </>
      ) : (
        <>
          <Upload className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
          <p className="text-foreground mb-1 text-sm font-medium">Drag & drop or click to upload</p>
          <p className="text-muted-foreground text-xs">Supports JPG, PNG, HEIC, MP4, MOV</p>
        </>
      )}
    </motion.div>
  )
}
