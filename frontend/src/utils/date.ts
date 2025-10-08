import { format, parseISO, isValid } from 'date-fns';
import { DATE_FORMATS } from '../constants';

/**
 * Format date string to display format
 */
export const formatDate = (
  date: string | Date | null | undefined,
  formatStr: string = DATE_FORMATS.DISPLAY
): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return format(dateObj, formatStr);
  } catch {
    return '';
  }
};

/**
 * Format date to input value (yyyy-MM-dd)
 */
export const formatDateForInput = (date: string | Date | null | undefined): string => {
  return formatDate(date, DATE_FORMATS.INPUT);
};

/**
 * Format datetime string to display format
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  return formatDate(date, DATE_FORMATS.DATETIME);
};

/**
 * Format time string
 */
export const formatTime = (date: string | Date | null | undefined): string => {
  return formatDate(date, DATE_FORMATS.TIME);
};

/**
 * Check if date is today
 */
export const isToday = (date: string | Date): boolean => {
  if (!date) return false;
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const today = new Date();
    return (
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()
    );
  } catch {
    return false;
  }
};

/**
 * Get current date in yyyy-MM-dd format
 */
export const getTodayDate = (): string => {
  return format(new Date(), DATE_FORMATS.INPUT);
};

/**
 * Calculate number of days between two dates
 */
export const calculateDaysBetween = (
  startDate: string | Date,
  endDate: string | Date
): number => {
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays + 1; // Include both start and end dates
  } catch {
    return 0;
  }
};
