'use client';
import Image from 'next/image';
import { useState } from 'react';
import { ActionForm, Field, TextArea } from '@/components/ui/action-form';
import { Uploader } from './uploader';
import { savePackage } from '@/features/packages/actions';
import type { Package } from '@/types/models';
export function PackageForm({ value }: { value?: Package }) {
  const [image, setImage] = useState(value?.image_path || '');
  return (
    <ActionForm action={savePackage} submit={value ? 'Save collection' : 'Create collection'}>
      <input type="hidden" name="id" value={value?.id || ''} />
      <input type="hidden" name="image_path" value={image} />
      <div className="package-editor-inner">
        <div className="form-stack">
          <div className="form-grid">
            <Field label="Collection name" name="title" defaultValue={value?.title} />
            <Field
              label="URL name"
              name="slug"
              defaultValue={value?.slug}
              placeholder="e.g. family-portraits"
            />
          </div>
          <TextArea
            label="Description"
            name="description"
            defaultValue={value?.description}
            required
          />
          <div className="form-grid">
            <Field
              label="Price (RM)"
              name="price"
              type="number"
              min={0}
              defaultValue={value?.price}
            />
            <Field
              label="Coverage hours"
              name="included_hours"
              type="number"
              min={1}
              max={72}
              defaultValue={value?.included_hours}
            />
          </div>
          <TextArea
            label="Inclusions (one per line)"
            name="features"
            defaultValue={value?.features.join('\n')}
          />
          <TextArea
            label="Perfect for (one per line)"
            name="best_for"
            defaultValue={value?.best_for.join('\n')}
          />
        </div>
        <div className="form-stack">
          <Field
            label="Badge (optional)"
            name="badge"
            defaultValue={value?.badge || ''}
            required={false}
          />
          <Field
            label="Display order"
            name="display_order"
            type="number"
            defaultValue={value?.display_order || 0}
          />
          <label className="checkbox-field">
            <input type="checkbox" name="is_active" defaultChecked={value?.is_active ?? true} />
            Show on the public website
          </label>
          {image && (
            <>
              <div className="package-image-preview">
                <Image
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/public-assets/${image}`}
                  alt="Collection image"
                  fill
                  sizes="400px"
                />
              </div>
              <button type="button" className="text-link" onClick={() => setImage('')}>
                Remove collection image
              </button>
            </>
          )}
          <Uploader onImage={setImage} />
          <p className="form-help">
            Upload completes separately. Save the collection to publish its new image.
          </p>
        </div>
      </div>
    </ActionForm>
  );
}
