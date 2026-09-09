import { z } from 'zod';
import { browser } from 'wxt/browser';
import { messageKeys, type MessageKey } from '../utils/generated-message-keys.utils';

export { messageKeys, type MessageKey } from '../utils/generated-message-keys.utils';

const catalogShape = Object.fromEntries(
  messageKeys.map((key) => [key, z.string().min(1)]),
) as Record<MessageKey, z.ZodString>;

export const MessageCatalogSchema = z.strictObject({
  ...catalogShape,
  videoJsLocale: z.enum(['ru', 'en']),
});

export type MessageCatalog = z.infer<typeof MessageCatalogSchema>;

export type Translate = (key: MessageKey, substitutions?: string | string[]) => string;

export const getMessage: Translate = (key, substitutions) => {
  const getBrowserMessage = browser.i18n.getMessage.bind(browser.i18n) as (messageKey: string, substitutions?: string | string[]) => string;
  const message = getBrowserMessage(key, substitutions);
  if (!message) throw new Error(`Missing browser translation: ${key}`);
  return message;
};

export const createCatalog = (): MessageCatalog => MessageCatalogSchema.parse({
  ...Object.fromEntries(messageKeys.map((key) => [key, getMessage(key)])),
  videoJsLocale: browser.i18n.getUILanguage().toLowerCase().startsWith('ru') ? 'ru' : 'en',
});
