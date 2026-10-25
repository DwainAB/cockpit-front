import { notifications } from '@mantine/notifications';

export const notifySuccess = (title: string, message?: string) =>
  notifications.show({ title, message, color: 'sage', withBorder: true, autoClose: 3500 });

export const notifyInfo = (title: string, message?: string) =>
  notifications.show({ title, message, color: 'night', withBorder: true, autoClose: 3500 });

export const notifyError = (title: string, message?: string) =>
  notifications.show({ title, message, color: 'red', withBorder: true, autoClose: 5000 });
