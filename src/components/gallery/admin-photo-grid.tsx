'use client';
import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Image as ImageIcon, MoreHorizontal, Move } from 'lucide-react';
import { Lightbox } from './lightbox';
import { ProtectedImage } from './protected-image';
import { DeleteButton } from '@/components/ui/delete-button';
import { deletePhoto, movePhoto, setAlbumCover } from '@/features/photos/actions';
import type { ActionResult, Photo } from '@/types/models';

type Change = { id: string; position: number } | { cover: string };
type TileProps = {
  photo: Photo;
  position: number;
  total: number;
  cover: boolean;
  pending: boolean;
  preview: () => void;
  changeCover: () => void;
  move: (position: number) => void;
};

function SortablePhoto({
  photo,
  position,
  total,
  cover,
  pending,
  preview,
  changeCover,
  move,
}: TileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id, disabled: pending });
  const [menu, setMenu] = useState(false);
  const [positionForm, setPositionForm] = useState(false);
  const options = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    function dismiss(event: PointerEvent) {
      if (
        !options.current?.contains(event.target as Node) &&
        !document.querySelector('[role="alertdialog"]')
      )
        setMenu(false);
    }
    function keyboard(event: KeyboardEvent) {
      if (document.querySelector('[role="alertdialog"]')) return;
      if (event.key === 'Escape') {
        setMenu(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', keyboard);
    };
  }, [menu]);
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`photo-tile admin-photo-tile ${isDragging ? 'photo-dragging' : ''}`}
      data-photo-id={photo.id}
    >
      <button
        className="photo-image-button"
        aria-label={`Preview ${photo.filename}`}
        onClick={preview}
      >
        <ProtectedImage
          src={photo.preview_url}
          fallback={`/api/photos/${photo.id}`}
          alt={photo.filename}
        />
      </button>
      {cover && (
        <span className="photo-cover-badge" aria-label={`Current cover: ${photo.filename}`}>
          <Check size={13} /> Cover
        </span>
      )}
      <div className="photo-tile-footer">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          className="photo-drag-handle"
          disabled={pending}
          aria-label={`Drag to reorder ${photo.filename}`}
          title="Drag to reorder. With a keyboard, press Space, use arrow keys, then Space to save."
        >
          <GripVertical size={19} />
        </button>
        <span title={photo.filename}>{photo.filename}</span>
        <div className="photo-options" ref={options}>
          <button
            ref={trigger}
            type="button"
            className="icon-button photo-options-trigger"
            disabled={pending}
            aria-label={`Photo options: ${photo.filename}`}
            aria-expanded={menu}
            aria-controls={`options-${photo.id}`}
            onClick={() => {
              setMenu(!menu);
              setPositionForm(false);
            }}
          >
            <MoreHorizontal size={21} />
          </button>
          {menu && (
            <div
              className="photo-options-menu"
              id={`options-${photo.id}`}
              aria-label={`Options for ${photo.filename}`}
            >
              <button
                type="button"
                disabled={pending || cover}
                onClick={() => {
                  setMenu(false);
                  changeCover();
                }}
              >
                {cover ? <Check size={16} /> : <ImageIcon size={16} />}{' '}
                {cover ? 'Current cover' : 'Make cover image'}
              </button>
              <button
                type="button"
                onClick={() => setPositionForm(!positionForm)}
                aria-expanded={positionForm}
              >
                <Move size={16} /> Move to position…
              </button>
              {positionForm && (
                <form
                  className="photo-position-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const target = Number(new FormData(event.currentTarget).get('position'));
                    if (!Number.isInteger(target) || target < 1 || target > total) return;
                    setMenu(false);
                    move(target - 1);
                  }}
                >
                  <label htmlFor={`position-${photo.id}`}>Position (1–{total})</label>
                  <div>
                    <input
                      id={`position-${photo.id}`}
                      type="number"
                      name="position"
                      min={1}
                      max={total}
                      required
                      defaultValue={position + 1}
                      aria-label={`Position for ${photo.filename}`}
                    />
                    <button type="submit" aria-label={`Move ${photo.filename} to position`}>
                      Move
                    </button>
                  </div>
                </form>
              )}
              <DeleteButton
                action={deletePhoto}
                id={photo.id}
                label="photograph"
                className="photo-menu-delete"
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function AdminPhotoGrid({
  photos,
  coverPath,
  offset = 0,
  total = photos.length,
}: {
  photos: Photo[];
  coverPath?: string | null;
  offset?: number;
  total?: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionResult>({});
  const [pending, startTransition] = useTransition();
  const [optimistic, updateOptimistic] = useOptimistic(
    { photos, coverPath },
    (state, change: Change) => {
      if ('cover' in change) return { ...state, coverPath: change.cover };
      const index = state.photos.findIndex((photo) => photo.id === change.id);
      if (index < 0) return state;
      return { ...state, photos: arrayMove(state.photos, index, change.position) };
    },
  );
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const close = useCallback(() => setSelected(null), []);
  function change(action: () => Promise<ActionResult>, update?: Change) {
    if (pending) return;
    setFeedback({});
    startTransition(async () => {
      if (update) updateOptimistic(update);
      try {
        setFeedback(await action());
      } catch {
        setFeedback({ error: 'Unable to save. Please try again.' });
      }
    });
  }
  function drop({ active, over }: DragEndEvent) {
    setDragged(null);
    if (!over || active.id === over.id || pending) return;
    const position = optimistic.photos.findIndex((photo) => photo.id === over.id);
    if (position < 0) return;
    change(() => movePhoto(String(active.id), offset + position), {
      id: String(active.id),
      position,
    });
  }
  const activePhoto = optimistic.photos.find((photo) => photo.id === dragged);
  const images = optimistic.photos.map((photo) => ({
    id: photo.id,
    src: photo.preview_url || `/api/photos/${photo.id}`,
    fallback: `/api/photos/${photo.id}`,
    alt: photo.filename,
    download: `/api/photos/${photo.id}?download=1`,
  }));
  const selectedIndex = optimistic.photos.findIndex((photo) => photo.id === selected);
  return (
    <>
      <div className="photo-management-heading">
        <div>
          <h2>Photographs &amp; display order</h2>
          <p>
            Drag the handle to rearrange photos. On a phone, hold the handle briefly, then drag.
            Open the three-dot menu to choose the cover shown on the client gallery home. Changes
            save automatically.
          </p>
        </div>
        {pending && <span role="status">Saving changes…</span>}
        {feedback.error && !pending && (
          <p className="notice error" role="alert">
            {feedback.error}
          </p>
        )}
        {feedback.success && !pending && (
          <p className="notice success" role="status">
            {feedback.success}
          </p>
        )}
      </div>
      <DndContext
        id={`photo-order-${photos[0]?.album_id || 'empty'}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => {
          setDragged(String(active.id));
          setFeedback({});
        }}
        onDragCancel={() => setDragged(null)}
        onDragEnd={drop}
      >
        <SortableContext
          items={optimistic.photos.map((photo) => photo.id)}
          strategy={rectSortingStrategy}
        >
          <div className="photo-grid">
            {optimistic.photos.map((photo, index) => (
              <SortablePhoto
                key={photo.id}
                photo={photo}
                position={offset + index}
                total={total}
                cover={photo.thumbnail_path === optimistic.coverPath}
                pending={pending}
                preview={() => setSelected(photo.id)}
                changeCover={() =>
                  change(() => setAlbumCover(photo.id), { cover: photo.thumbnail_path })
                }
                move={(position) => change(() => movePhoto(photo.id, position))}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activePhoto && (
            <div className="photo-tile photo-drag-overlay">
              <ProtectedImage
                src={activePhoto.preview_url}
                fallback={`/api/photos/${activePhoto.id}`}
                alt={activePhoto.filename}
                loading="eager"
              />
              <div className="photo-tile-footer">
                <GripVertical size={19} />
                <span>{activePhoto.filename}</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      {selectedIndex >= 0 && <Lightbox images={images} index={selectedIndex} onClose={close} />}
    </>
  );
}
