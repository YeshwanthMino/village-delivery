// Parses an incoming push notification's data payload into the one field the
// app currently acts on. The payload shape is producer-controlled (whatever
// sends the push), so every field is treated as untrusted/unknown.

export interface NotificationPayload {
  route?: string;
}

export function parseNotificationPayload(data: unknown): NotificationPayload {
  if (!data || typeof data !== 'object') return {};
  const route = (data as Record<string, unknown>).route;
  return typeof route === 'string' ? { route } : {};
}
