'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/lib/icons'
import type { AttachmentView } from './page.client'

const ACCEPTED_MIME = [
  'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm',
]
const MAX_BYTES = 100 * 1024 * 1024 // 100 MB

function kindFromMime(mime: string): 'image' | 'video' | 'other' {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return 'other'
}

function extFromName(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : 'bin'
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function uuidish(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'a-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function AttachmentsPanel({
  estimateId,
  companyId,
  isOwner,
  initial,
}: {
  estimateId: string
  companyId: string | null
  isOwner: boolean
  initial: AttachmentView[]
}) {
  const [items, setItems] = useState<AttachmentView[]>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressName, setProgressName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [lightboxId, setLightboxId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const lightbox = lightboxId ? items.find((a) => a.id === lightboxId) ?? null : null

  async function handleFiles(fileList: FileList | File[]) {
    if (!companyId) {
      setError('Not signed in.')
      return
    }
    const files = Array.from(fileList)
    if (files.length === 0) return

    setError(null)
    setBusy(true)
    const supabase = createClient()

    for (const file of files) {
      setProgressName(file.name)
      if (file.size > MAX_BYTES) {
        setError(`"${file.name}" is too large (max 100 MB).`)
        continue
      }
      if (!ACCEPTED_MIME.includes(file.type)) {
        setError(`"${file.name}" is not a supported type (images and videos only).`)
        continue
      }

      const ext = extFromName(file.name)
      const path = `${companyId}/${estimateId}/${uuidish()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('estimate-attachments')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (upErr) {
        setError(`Upload failed for "${file.name}": ${upErr.message}`)
        continue
      }

      const kind = kindFromMime(file.type)
      const { data: insertRow, error: insErr } = await supabase
        .from('estimate_attachments')
        .insert({
          company_id: companyId,
          estimate_id: estimateId,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          kind,
        })
        .select('id, created_at')
        .single()
      if (insErr || !insertRow) {
        // Roll back the storage upload to avoid orphaned files.
        await supabase.storage.from('estimate-attachments').remove([path])
        setError(`Save failed for "${file.name}": ${insErr?.message ?? 'unknown error'}`)
        continue
      }

      const { data: signed } = await supabase.storage
        .from('estimate-attachments')
        .createSignedUrl(path, 3600)

      setItems((prev) => [
        ...prev,
        {
          id: insertRow.id,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          kind,
          url: signed?.signedUrl ?? null,
          createdAt: insertRow.created_at,
        },
      ])
    }

    setProgressName(null)
    setBusy(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  async function deleteAttachment(att: AttachmentView) {
    if (!confirm(`Delete "${att.fileName}"?`)) return
    setError(null)
    setBusy(true)
    const supabase = createClient()

    // Fetch path from db before delete (we don't have it client-side after server fetch)
    const { data: row, error: fetchErr } = await supabase
      .from('estimate_attachments')
      .select('storage_path')
      .eq('id', att.id)
      .single()
    if (fetchErr || !row) {
      setError(`Could not locate the file: ${fetchErr?.message ?? 'not found'}`)
      setBusy(false)
      return
    }

    const { error: delDbErr } = await supabase.from('estimate_attachments').delete().eq('id', att.id)
    if (delDbErr) {
      setError(`Delete failed: ${delDbErr.message}`)
      setBusy(false)
      return
    }
    await supabase.storage.from('estimate-attachments').remove([row.storage_path])
    setItems((prev) => prev.filter((x) => x.id !== att.id))
    setBusy(false)
    if (lightboxId === att.id) setLightboxId(null)
  }

  return (
    <>
      <div className="section-h" style={{ marginTop: 18 }}>
        <span>Photos & Videos</span>
        <span className="count">{items.length}</span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!dragging) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
        }}
        style={{
          border: `2px dashed ${dragging ? 'var(--forest-700)' : 'var(--cream-200)'}`,
          background: dragging ? 'var(--sage-50)' : '#fff',
          borderRadius: 14,
          padding: 18,
          textAlign: 'center',
          marginBottom: 10,
          transition: 'background 120ms, border-color 120ms',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--stone-400)' }}>
          <Icon.camera width="28" height="28" />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--forest-800)', marginBottom: 4 }}>
          Add photos or videos
        </div>
        <div style={{ fontSize: 12, color: 'var(--stone-500)', marginBottom: 12, lineHeight: 1.5 }}>
          Drag & drop here, or use the buttons below. Up to 100 MB per file.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => cameraInputRef.current?.click()}
            className="touch-only"
            style={pillBtn(true, busy)}
          >
            <Icon.camera width="14" height="14" w={2.2} />
            <span>Take photo</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            style={pillBtn(false, busy)}
          >
            <Icon.plus width="14" height="14" w={2.2} />
            <span>Choose files</span>
          </button>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_MIME.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {busy && (
          <div style={{ fontSize: 12, color: 'var(--stone-500)', marginTop: 10 }}>
            Uploading{progressName ? ` ${progressName}` : '…'}
          </div>
        )}
        {error && (
          <div style={{ fontSize: 12.5, color: '#a02020', marginTop: 10 }}>{error}</div>
        )}
      </div>

      {items.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: 8,
            marginBottom: 10,
          }}
        >
          {items.map((att) => (
            <div
              key={att.id}
              style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                borderRadius: 12,
                overflow: 'hidden',
                background: 'var(--cream-100)',
                border: '1px solid var(--cream-200)',
              }}
            >
              <button
                type="button"
                onClick={() => setLightboxId(att.id)}
                style={{
                  width: '100%',
                  height: '100%',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'block',
                }}
                aria-label={`Open ${att.fileName}`}
              >
                {att.kind === 'image' && att.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={att.url}
                    alt={att.fileName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
                {att.kind === 'video' && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: '#1a1a1a',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      gap: 6,
                      flexDirection: 'column',
                    }}
                  >
                    <PlayIcon />
                    <span style={{ fontSize: 11, opacity: 0.8 }}>Video</span>
                  </div>
                )}
                {att.kind === 'other' && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--stone-500)',
                      fontSize: 11,
                      padding: 6,
                      textAlign: 'center',
                    }}
                  >
                    {att.fileName}
                  </div>
                )}
              </button>
              {isOwner && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteAttachment(att)
                  }}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Delete"
                  aria-label={`Delete ${att.fileName}`}
                >
                  <Icon.trash width="14" height="14" w={2.2} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <>
          <div
            onClick={() => setLightboxId(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 41,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              pointerEvents: 'none',
            }}
          >
            <button
              onClick={() => setLightboxId(null)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: 'none',
                fontSize: 22,
                cursor: 'pointer',
                pointerEvents: 'auto',
              }}
              aria-label="Close"
            >
              ×
            </button>
            <div style={{ pointerEvents: 'auto', maxWidth: '92vw', maxHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {lightbox.kind === 'image' && lightbox.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={lightbox.url}
                  alt={lightbox.fileName}
                  style={{ maxWidth: '92vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
                />
              )}
              {lightbox.kind === 'video' && lightbox.url && (
                <video
                  src={lightbox.url}
                  controls
                  playsInline
                  style={{ maxWidth: '92vw', maxHeight: '80vh', borderRadius: 8 }}
                />
              )}
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 24,
                left: 24,
                right: 24,
                color: '#fff',
                fontSize: 13,
                textAlign: 'center',
                pointerEvents: 'auto',
              }}
            >
              <div style={{ fontWeight: 600 }}>{lightbox.fileName}</div>
              <div style={{ opacity: 0.7, fontSize: 11.5, marginTop: 2 }}>{fmtSize(lightbox.sizeBytes)}</div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function pillBtn(primary: boolean, busy: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 14px',
    borderRadius: 999,
    background: primary ? 'var(--forest-800)' : '#fff',
    color: primary ? '#fff' : 'var(--forest-800)',
    border: primary ? 'none' : '1px solid var(--cream-200)',
    fontSize: 13,
    fontWeight: 600,
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.7 : 1,
    fontFamily: 'inherit',
  }
}

function PlayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  )
}
