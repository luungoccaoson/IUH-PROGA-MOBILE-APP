import { useLanguageStore } from '../stores/useLanguageStore';
import { translations } from './translations';
import { systemTranslations } from './systemTranslations';
export type TranslationKey = keyof typeof translations;
export const locales = { vi: 'vi-VN', en: 'en-US', zh: 'zh-CN' } as const;
const dictionary: Record<string, { vi?: string; en: string; zh: string }> = { ...translations, ...systemTranslations };

/** Only call for system labels, never for user-authored names or descriptions. */
export function translate(key: string, values: Record<string, string | number> = {}): string {
  const language = useLanguageStore.getState().language;
  const entry = dictionary[key];
  const text = language === 'vi' ? entry?.vi ?? key : entry?.[language] ?? key;
  return text.replace(/\{(\d+|\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match);
}

export function systemLabel(value: string): string {
  const keys: Record<string, string> = {
    TODO: 'Cần làm', IN_PROGRESS: 'Đang làm', 'IN PROGRESS': 'Đang làm',
    REVIEW: 'Đang duyệt (Review)', DONE: 'Hoàn thành',
    LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', URGENT: 'Khẩn cấp',
    OWNER: 'Chủ sở hữu', ADMIN: 'Quản trị viên', PM: 'Quản lý dự án', MEMBER: 'Thành viên',
    REQUIREMENT: 'Requirement Agent', TECHNICAL_ADVISOR: 'Tech Advisor Agent',
  };
  return translate(keys[value] ?? value);
}
export function useTranslation() {
  const language = useLanguageStore(state => state.language);
  return { language, locale: locales[language], t: (key: TranslationKey): string => translate(key) };
}
