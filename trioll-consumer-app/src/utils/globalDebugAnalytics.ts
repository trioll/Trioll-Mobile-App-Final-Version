import { checkAnalyticsQueue } from './checkAnalyticsQueue';

// Make analytics check available globally
(global as any).checkAnalytics = async () => {
  console.log('🔍 Running Analytics Queue Check...');
  const events = await checkAnalyticsQueue();
  return events;
};

console.log('💡 Analytics debug available globally: checkAnalytics()');

export {};// Force reload

