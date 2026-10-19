'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { ActionForm, Field } from '@/components/ui/action-form';
import { Uploader } from './uploader';
import {
  saveHomepagePhoto,
  deleteHomepagePhoto,
  toggleHomepagePhoto,
  reorderHomepagePhotos,
} from '@/features/homepage/actions';
import type { HomepagePhoto } from '@/types/models';

export function HomepagePhotoManager({
  photos: initialPhotos,
  supabaseUrl,
}: {
  photos: HomepagePhoto[];
  supabaseUrl: string;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<HomepagePhoto[]>(initialPhotos);
  const [prevInitialPhotos, setPrevInitialPhotos] = useState<HomepagePhoto[]>(initialPhotos);
  const [newImage, setNewImage] = useState('');
  const [isPending, startTransition] = useTransition();

  const cleanSupabaseUrl = (supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');

  if (initialPhotos !== prevInitialPhotos) {
    setPrevInitialPhotos(initialPhotos);
    setPhotos(initialPhotos);
  }

  const handleToggle = (id: string, current: boolean) => {
    startTransition(async () => {
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !current } : p)),
      );
      await toggleHomepagePhoto(id, !current);
      router.refresh();
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= photos.length) return;

    const updated = [...photos];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    setPhotos(updated);
    startTransition(async () => {
      await reorderHomepagePhotos(updated.map((p) => p.id));
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Remove this photo from the homepage showcase?')) return;
    startTransition(async () => {
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      await deleteHomepagePhoto(id);
      router.refresh();
    });
  };

  return (
    <div className="homepage-manager-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Current showcase photos</h2>
            <p>
              Reorder, toggle visibility, or remove photos currently highlighted on your homepage.
            </p>
          </div>
          <span className="badge">
            {photos.filter((p) => p.is_active).length} visible on homepage
          </span>
        </div>

        {photos.length === 0 ? (
          <div className="empty-state">
            <Sparkles size={28} className="gold" />
            <p className="empty-title">No showcase photos yet</p>
            <p className="empty-description">
              Upload your first photograph below to feature it prominently on the homepage portfolio.
            </p>
          </div>
        ) : (
          <div className="homepage-photos-list">
            {photos.map((photo, index) => {
              const cleanPath = photo.storage_path.replace(/^\/+/, '');
              const imageUrl = photo.storage_path.startsWith('http')
                ? photo.storage_path
                : `${cleanSupabaseUrl}/storage/v1/object/public/public-assets/${cleanPath}`;

              return (
                <article
                  key={photo.id}
                  className={`homepage-photo-card ${photo.is_active ? 'active' : 'inactive'}`}
                >
                  <div className="homepage-photo-thumb">
                    <Image
                      src={imageUrl}
                      alt={photo.alt || photo.title || 'Homepage showcase photo'}
                      fill
                      sizes="160px"
                      className="photo-img"
                    />
                  </div>

                  <div className="homepage-photo-info">
                    <div className="photo-header">
                      <span className="category-tag">{photo.category || 'General'}</span>
                      <span className={`status-pill ${photo.is_active ? 'live' : 'hidden'}`}>
                        {photo.is_active ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                    <h3 className="photo-title">{photo.title || 'Untitled portrait'}</h3>
                    {photo.label && <p className="photo-label">{photo.label}</p>}
                  </div>

                  <div className="homepage-photo-actions">
                    <div className="reorder-buttons">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0 || isPending}
                        aria-label="Move photo up"
                        title="Move up"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === photos.length - 1 || isPending}
                        aria-label="Move photo down"
                        title="Move down"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className={`button button-small ${photo.is_active ? 'button-outline' : 'button-gold'}`}
                      onClick={() => handleToggle(photo.id, photo.is_active)}
                      disabled={isPending}
                      aria-label={photo.is_active ? 'Hide photo' : 'Show photo'}
                    >
                      {photo.is_active ? (
                        <>
                          <EyeOff size={14} /> Hide
                        </>
                      ) : (
                        <>
                          <Eye size={14} /> Show
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="icon-button delete-btn"
                      onClick={() => handleDelete(photo.id)}
                      disabled={isPending}
                      aria-label="Delete photo"
                      title="Delete photo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Add new showcase photograph</h2>
            <p>Upload a high-resolution image to highlight on your website homepage.</p>
          </div>
        </div>

        <ActionForm
          action={async (prev, formData) => {
            const uploadedPath = newImage;
            const res = await saveHomepagePhoto(prev, formData);
            if (res.success) {
              setNewImage('');
              const title = String(formData.get('title') || '');
              const alt = String(formData.get('alt') || title);
              const label = String(formData.get('label') || '');
              const category = String(formData.get('category') || 'Bridal portraits');
              const is_active = formData.has('is_active') ? formData.get('is_active') === 'on' : true;
              const nowIso = new Date().toISOString();
              const newPhoto: HomepagePhoto = {
                id: res.id || `temp-${Date.now()}`,
                storage_path: uploadedPath,
                title,
                alt,
                label,
                category,
                display_order: photos.length,
                is_active,
                created_at: nowIso,
                updated_at: nowIso,
              };
              setPhotos((prev) => [...prev, newPhoto]);
              router.refresh();
            }
            return res;
          }}
          submit="Add to homepage showcase"
        >
          <input type="hidden" name="storage_path" value={newImage} />
          <input type="hidden" name="display_order" value={photos.length} />

          <div className="form-stack">
            {newImage ? (
              <div className="uploaded-preview-container">
                <div className="package-image-preview">
                  <Image
                    src={`${cleanSupabaseUrl}/storage/v1/object/public/public-assets/${newImage.replace(/^\/+/, '')}`}
                    alt="Uploaded preview"
                    fill
                    sizes="400px"
                  />
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setNewImage('')}
                >
                  Choose a different photograph
                </button>
              </div>
            ) : (
              <div className="uploader-wrapper">
                <label className="field-label">Photograph file</label>
                <Uploader target="homepage" onImage={setNewImage} />
                <p className="form-help">
                  Select a JPG, PNG or WebP under 8 MB. It will be resized into a lightweight, sharp preview automatically.
                </p>
              </div>
            )}

            <Field
              label="Title / Caption"
              name="title"
              placeholder="e.g. A moment, timeless."
              required
            />

            <Field
              label="Editorial label (optional)"
              name="label"
              placeholder="e.g. THE BEAUTY OF TRADITION"
              required={false}
            />

            <div className="form-grid">
              <div className="field">
                <label className="field-label" htmlFor="category-select">
                  Portfolio category
                </label>
                <select
                  id="category-select"
                  name="category"
                  className="field-input"
                  defaultValue="Bridal portraits"
                >
                  <option value="Bridal portraits">Bridal portraits</option>
                  <option value="Celebrations">Celebrations</option>
                  <option value="Portraits">Portraits</option>
                  <option value="Editorial">Editorial</option>
                </select>
              </div>

              <Field
                label="Image alt text (for accessibility)"
                name="alt"
                placeholder="e.g. Bride in traditional red sari"
                required={false}
              />
            </div>

            <label className="checkbox-field">
              <input type="checkbox" name="is_active" defaultChecked={true} />
              Publish immediately on homepage
            </label>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
