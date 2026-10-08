'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, Check, AlertCircle, ImagePlus } from 'lucide-react';
type Upload = {
  name: string;
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
};
export function Uploader({
  albumId,
  onImage,
}: {
  albumId?: string;
  onImage?: (path: string) => void;
}) {
  const [uploads, setUploads] = useState<Upload[]>([]),
    [busy, setBusy] = useState(false),
    input = useRef<HTMLInputElement>(null),
    router = useRouter();
  const patch = (index: number, value: Partial<Upload>) =>
    setUploads((rows) => rows.map((row, i) => (i === index ? { ...row, ...value } : row)));
  async function send(files: FileList | null) {
    if (!files || busy) return;
    const list = Array.from(files).slice(0, albumId ? 100 : 1);
    setUploads(list.map((f) => ({ name: f.name, progress: 0, status: 'queued' })));
    setBusy(true);
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      try {
        if (
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
          file.size > (albumId ? 25 : 8) * 1024 * 1024
        )
          throw new Error(`Use JPG, PNG or WebP under ${albumId ? 25 : 8} MB.`);
        patch(i, { status: 'uploading' });
        const prepared = await fetch('/api/uploads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phase: 'prepare',
            albumId,
            filename: file.name,
            type: file.type,
            size: file.size,
          }),
        });
        const data = await prepared.json();
        if (!prepared.ok) throw new Error(data.error);
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', data.url);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.setRequestHeader('Cache-Control', albumId ? 'max-age=0' : 'max-age=3600');
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) patch(i, { progress: Math.round((e.loaded / e.total) * 90) });
          };
          xhr.onload = () =>
            xhr.status < 300
              ? resolve()
              : reject(new Error('Photo transfer failed. Try this file again.'));
          xhr.onerror = () => reject(new Error('Connection interrupted. Try this file again.'));
          xhr.send(file);
        });
        const completed = await fetch('/api/uploads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase: 'complete', ticket: data.ticket }),
        });
        const result = await completed.json();
        if (!completed.ok) throw new Error(result.error);
        patch(i, { status: 'done', progress: 100 });
        onImage?.(result.path);
      } catch (error) {
        patch(i, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed.',
        });
      }
    }
    setBusy(false);
    router.refresh();
    if (input.current) input.current.value = '';
  }
  return (
    <div className="uploader">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={!!albumId}
        hidden
        onChange={(e) => send(e.target.files)}
      />
      <button
        type="button"
        className={`dropzone ${busy ? 'uploading' : ''}`}
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          send(e.dataTransfer.files);
        }}
      >
        <span className="icon-tile">
          <UploadCloud size={27} />
        </span>
        <strong>
          {busy
            ? 'Preparing your photographs…'
            : albumId
              ? 'Drop your photos here'
              : 'Upload a package image'}
        </strong>
        <span>or click to browse · JPG, PNG, WebP · up to {albumId ? 25 : 8} MB each</span>
        <span className="button button-outline button-small">
          <ImagePlus size={16} />
          {albumId ? 'Choose photographs' : 'Choose image'}
        </span>
      </button>
      {uploads.length > 0 && (
        <ul className="upload-list" aria-live="polite">
          {uploads.map((u, i) => (
            <li key={i}>
              <div>
                <span className="truncate">{u.name}</span>
                {u.status === 'done' ? (
                  <Check size={16} className="green" />
                ) : u.status === 'error' ? (
                  <AlertCircle size={16} className="red" />
                ) : (
                  <span>{u.progress}%</span>
                )}
              </div>
              {u.status === 'error' ? (
                <p className="red">{u.error}</p>
              ) : (
                <progress value={u.progress} max={100} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
