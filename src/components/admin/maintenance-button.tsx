'use client';
import { useState, useTransition } from 'react';
import { LoaderCircle, HardDrive } from 'lucide-react';
import { cleanIncompleteUploads } from '@/features/photos/maintenance';
export function MaintenanceButton() {
  const [state, setState] = useState<{ error?: string; success?: string }>({}),
    [pending, start] = useTransition();
  return (
    <div className="storage-maintenance">
      <button
        className="button button-outline button-small"
        disabled={pending}
        onClick={() => start(async () => setState(await cleanIncompleteUploads()))}
      >
        {pending ? <LoaderCircle className="spin" size={15} /> : <HardDrive size={15} />}
        Clean incomplete uploads
      </button>
      {state.error && (
        <p className="notice error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="notice success" role="status">
          {state.success}
        </p>
      )}
    </div>
  );
}
