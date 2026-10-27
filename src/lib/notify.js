/** Notification helpers — permission handling kept out of the components. */

export function notificationsSupported() {
  return 'Notification' in window;
}

export function notificationPermission() {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export function requestNotificationPermission() {
  if (!notificationsSupported()) return Promise.resolve('unsupported');
  if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
  return Notification.requestPermission().catch(() => 'denied');
}

export function pushNotification(title, body) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, tag: title, icon: '/foodtimer/favicon.ico' });
  } catch {
    /* iOS Safari throws for non-service-worker notifications — ignore. */
  }
}
