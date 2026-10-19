export function field(data: FormData, key: string, max = 200) {
  const value = String(data.get(key) || '').trim();
  if (!value || value.length > max)
    throw new Error(`Please provide a valid ${key.replaceAll('_', ' ')}.`);
  return value;
}
export function emailValue(value: string) {
  const email = value.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new Error('Enter a valid email address.');
  return email;
}
export function passwordValue(value: string) {
  if (
    value.length < 12 ||
    value.length > 128 ||
    !/[a-z]/.test(value) ||
    !/[A-Z]/.test(value) ||
    !/[0-9]/.test(value)
  )
    throw new Error('Use 12–128 characters with uppercase, lowercase and a number.');
  return value;
}
export function uuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    throw new Error('Invalid record identifier.');
  return value;
}
export function message(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
export function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export function validatePixiesetUrl(rawUrl: string | null | undefined): string | null {
  const value = String(rawUrl || '').trim();
  if (!value) return null;
  if (value.length > 2000) throw new Error('Pixieset gallery URL is too long.');

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Please enter a valid Pixieset gallery URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Pixieset gallery URL must use a secure HTTPS connection.');
  }

  const hostname = parsed.hostname.toLowerCase();
  const isValidHost = hostname === 'pixieset.com' || hostname.endsWith('.pixieset.com');
  if (!isValidHost || parsed.username || parsed.password) {
    throw new Error('Please enter a valid Pixieset gallery URL (e.g., https://yourstudio.pixieset.com/galleryname).');
  }

  return parsed.toString();
}

export function validateGoogleDriveUrl(rawUrl: string | null | undefined): string | null {
  const value = String(rawUrl || '').trim();
  if (!value) return null;
  if (value.length > 2000) throw new Error('Google Drive URL is too long.');

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Please enter a valid Google Drive URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Google Drive URL must use a secure HTTPS connection.');
  }

  const hostname = parsed.hostname.toLowerCase();
  const isValidHost = hostname === 'drive.google.com' || hostname === 'docs.google.com';
  if (!isValidHost || parsed.username || parsed.password) {
    throw new Error('Please enter a valid Google Drive link (e.g., https://drive.google.com/drive/folders/...).');
  }

  return parsed.toString();
}
