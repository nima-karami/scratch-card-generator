/** Matches crypto.randomUUID() (RFC 4122 version 4). */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isJobIdParam(value: string | undefined): value is string {
  return Boolean(value && UUID_V4.test(value));
}
