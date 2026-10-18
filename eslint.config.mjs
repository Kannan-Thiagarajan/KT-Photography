import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Private photographs use authenticated endpoints and bypass the shared image cache.
  { files: ['src/components/gallery/*.tsx'], rules: { '@next/next/no-img-element': 'off' } },
  globalIgnores(['.next/**', '.local/**', 'supabase/functions/**', 'next-env.d.ts']),
]);
