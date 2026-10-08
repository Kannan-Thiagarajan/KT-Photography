'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, LoaderCircle, X } from 'lucide-react';
import type { ActionResult } from '@/types/models';
export function DeleteButton({
  action,
  id,
  label,
  redirectTo,
}: {
  action: (id: string) => Promise<ActionResult>;
  id: string;
  label: string;
  redirectTo?: string;
}) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState(''),
    [pending, start] = useTransition(),
    router = useRouter();
  return (
    <>
      <button
        type="button"
        className="button button-danger button-small"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${label}`}
      >
        <Trash2 size={15} />
        Delete
      </button>
      {open && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-${id}`}
          >
            <button
              autoFocus
              className="icon-button modal-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X />
            </button>
            <div className="icon-tile danger">
              <Trash2 />
            </div>
            <h2 id={`delete-${id}`}>Delete {label}?</h2>
            <p>
              This permanently removes {label} and its stored photographs. This action cannot be
              undone.
            </p>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <div className="button-row">
              <button
                className="button button-outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Keep {label}
              </button>
              <button
                className="button button-danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const result = await action(id);
                    if (result.error) setError(result.error);
                    else {
                      setOpen(false);
                      if (redirectTo) router.push(redirectTo);
                      router.refresh();
                    }
                  })
                }
              >
                {pending ? <LoaderCircle className="spin" /> : <Trash2 size={16} />}
                Delete permanently
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
