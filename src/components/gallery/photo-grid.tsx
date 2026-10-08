'use client';
import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { Lightbox } from './lightbox';
import { DeleteButton } from '@/components/ui/delete-button';
import { deletePhoto, movePhoto, setAlbumCover } from '@/features/photos/actions';
import type { ActionResult, Photo } from '@/types/models';
export function PhotoGrid({
  photos,
  admin = false,
  coverPath,
  offset = 0,
  total = photos.length,
}: {
  photos: Photo[];
  admin?: boolean;
  coverPath?: string | null;
  offset?: number;
  total?: number;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<ActionResult>({});
  const [dragged, setDragged] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const close = useCallback(() => setSelected(null), []);
  function change(action: () => Promise<ActionResult>) {
    if (pending) return;
    setFeedback({});
    startTransition(async () => {
      try {
        const result = await action();
        setFeedback(result);
        if (result.success) {
          setSelected(null);
          router.refresh();
        }
      } catch {
        setFeedback({ error: 'Unable to save. Please try again.' });
      }
    });
  }
  const images = photos.map((p) => ({
    id: p.id,
    src: `/api/photos/${p.id}`,
    alt: p.filename,
    download: `/api/photos/${p.id}?download=1`,
  }));
  return (
    <>
      {admin && (
        <div className="photo-management-heading">
          <div>
            <h2>Photographs &amp; display order</h2>
            <p>
              Drag by the handle, use the arrows, or enter a position. Changes save automatically.
              Choose a cover to display on the client gallery home.
            </p>
          </div>
          {pending && <span role="status">Saving changes…</span>}
          {feedback.error && (
            <p className="notice error" role="alert">
              {feedback.error}
            </p>
          )}
          {feedback.success && (
            <p className="notice success" role="status">
              {feedback.success}
            </p>
          )}
        </div>
      )}
      <div className="photo-grid">
        {photos.map((p, i) => (
          <article
            className={`photo-tile ${dragged === p.id ? 'photo-dragging' : ''}`}
            key={p.id}
            data-photo-id={p.id}
            onDragOver={(e) => {
              if (admin && dragged && !pending) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (!admin || pending || !dragged || dragged === p.id) return;
              const id = dragged;
              setDragged(null);
              change(() => movePhoto(id, offset + i));
            }}
          >
            <button
              className="photo-image-button"
              aria-label={`Preview ${p.filename}`}
              onClick={() => setSelected(i)}
            >
              {}
              <img src={`/api/photos/${p.id}`} alt={p.filename} loading="lazy" />
            </button>
            <div className="photo-tile-footer">
              <span title={p.filename}>{p.filename}</span>
              {admin ? (
                <DeleteButton action={deletePhoto} id={p.id} label="photograph" />
              ) : (
                <a href={`/api/photos/${p.id}?download=1`} aria-label={`Download ${p.filename}`}>
                  <Download size={15} />
                </a>
              )}
            </div>
            {admin && (
              <div className="photo-edit-controls">
                <button
                  type="button"
                  disabled={pending || p.thumbnail_path === coverPath}
                  className={`photo-cover-button ${p.thumbnail_path === coverPath ? 'selected' : ''}`}
                  aria-pressed={p.thumbnail_path === coverPath}
                  aria-label={`${p.thumbnail_path === coverPath ? 'Current cover' : 'Use as cover'}: ${p.filename}`}
                  onClick={() => change(() => setAlbumCover(p.id))}
                >
                  {p.thumbnail_path === coverPath ? <Check size={14} /> : <ImageIcon size={14} />}
                  {p.thumbnail_path === coverPath ? 'Current cover' : 'Use as cover'}
                </button>
                <div className="photo-order-controls">
                  <button
                    type="button"
                    className="photo-drag-handle"
                    draggable={!pending}
                    aria-label={`Drag to reorder ${p.filename}`}
                    title="Drag to reorder"
                    disabled={pending}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', p.id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDragged(p.id);
                    }}
                    onDragEnd={() => setDragged(null)}
                  >
                    <GripVertical size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    disabled={pending || offset + i === 0}
                    aria-label={`Move ${p.filename} earlier`}
                    onClick={() => change(() => movePhoto(p.id, offset + i - 1))}
                  >
                    <ArrowLeft size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    disabled={pending || offset + i >= total - 1}
                    aria-label={`Move ${p.filename} later`}
                    onClick={() => change(() => movePhoto(p.id, offset + i + 1))}
                  >
                    <ArrowRight size={15} />
                  </button>
                  <form
                    key={`${p.id}-${offset + i}`}
                    className="photo-position-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const position = Number(new FormData(e.currentTarget).get('position'));
                      if (!Number.isInteger(position) || position < 1 || position > total) {
                        setFeedback({ error: `Choose a position from 1 to ${total}.` });
                        return;
                      }
                      change(() => movePhoto(p.id, position - 1));
                    }}
                  >
                    <input
                      type="number"
                      name="position"
                      min={1}
                      max={total}
                      required
                      defaultValue={offset + i + 1}
                      disabled={pending}
                      aria-label={`Position for ${p.filename}`}
                    />
                    <button
                      type="submit"
                      disabled={pending}
                      aria-label={`Move ${p.filename} to position`}
                    >
                      Move
                    </button>
                  </form>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
      {selected !== null && <Lightbox images={images} index={selected} onClose={close} />}
    </>
  );
}
