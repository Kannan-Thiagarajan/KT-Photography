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
