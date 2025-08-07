/**
 * Date formatting utilities
 */

interface FormatOptions {
  addSuffix?: boolean;
}

export function formatDistanceToNow(date: Date, options?: FormatOptions): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    const result = 'just now';
    return options?.addSuffix ? result : result;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    const result = diffInMinutes === 1 ? '1 minute' : `${diffInMinutes} minutes`;
    return options?.addSuffix ? `${result} ago` : result;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    const result = diffInHours === 1 ? '1 hour' : `${diffInHours} hours`;
    return options?.addSuffix ? `${result} ago` : result;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    const result = diffInDays === 1 ? '1 day' : `${diffInDays} days`;
    return options?.addSuffix ? `${result} ago` : result;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    const result = diffInWeeks === 1 ? '1 week' : `${diffInWeeks} weeks`;
    return options?.addSuffix ? `${result} ago` : result;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    const result = diffInMonths === 1 ? '1 month' : `${diffInMonths} months`;
    return options?.addSuffix ? `${result} ago` : result;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  const result = diffInYears === 1 ? '1 year' : `${diffInYears} years`;
  return options?.addSuffix ? `${result} ago` : result;
}

export function formatDate(date: Date, format: 'short' | 'long' = 'short'): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const monthsLong = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  if (format === 'short') {
    return `${months[month]} ${day}, ${year}`;
  } else {
    return `${monthsLong[month]} ${day}, ${year}`;
  }
}

export function formatTime(date: Date, use24Hour = false): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes.toString();

  if (use24Hour) {
    const hoursStr = hours < 10 ? `0${hours}` : hours.toString();
    return `${hoursStr}:${minutesStr}`;
  } else {
    const isPM = hours >= 12;
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutesStr} ${isPM ? 'PM' : 'AM'}`;
  }
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

export function formatRelativeDate(date: Date): string {
  if (isToday(date)) {
    return `Today at ${formatTime(date)}`;
  } else if (isYesterday(date)) {
    return `Yesterday at ${formatTime(date)}`;
  } else {
    return `${formatDate(date)} at ${formatTime(date)}`;
  }
}
