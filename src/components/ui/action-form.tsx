'use client';
import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ActionResult } from '@/types/models';
type Props = {
  action: (state: ActionResult, data: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submit?: string;
  redirectBase?: string;
  resetOnSuccess?: boolean;
  className?: string;
};
export function ActionForm({
  action,
  children,
  submit = 'Save changes',
  redirectBase,
  resetOnSuccess,
  className = '',
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const router = useRouter(),
    form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) {
      if (resetOnSuccess) form.current?.reset();
      if (redirectBase && state.id) router.push(`${redirectBase}/${state.id}`);
      else router.refresh();
    }
  }, [state, router, redirectBase, resetOnSuccess]);
  return (
    <form action={formAction} ref={form} className={`form-stack ${className}`}>
      {children}
      {state.error && (
        <p className="notice error" role="alert">
          <AlertCircle size={18} />
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="notice success" role="status">
          <CheckCircle2 size={18} />
          {state.success}
        </p>
      )}
      <button className="button button-gold" disabled={pending} type="submit">
        {pending ? (
          <>
            <LoaderCircle size={17} className="spin" />
            Saving…
          </>
        ) : (
          submit
        )}
      </button>
    </form>
  );
}
export function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  required = true,
  placeholder,
  min,
  max,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  autoComplete?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        autoComplete={autoComplete}
      />
    </label>
  );
}
export function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={4}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}
