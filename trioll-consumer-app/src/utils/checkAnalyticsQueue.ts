import AsyncStorage from '@react-native-async-storage/async-storage';

export const checkAnalyticsQueue = async () => {
  try {
    console.log('🔍 Checking Analytics Queue...');
    
    // Check for queued events
    const queuedEvents = await AsyncStorage.getItem('analytics_events_queue');
    if (queuedEvents) {
      const events = JSON.parse(queuedEvents);
      console.log(`📊 Found ${events.length} queued analytics events:`);
      
      // Look for purchase intent events
      const purchaseIntentEvents = events.filter((e: any) => 
        e.event && e.event.includes('purchase_intent')
      );
      
      if (purchaseIntentEvents.length > 0) {
        console.log('🎯 Purchase Intent Events Found:');
        purchaseIntentEvents.forEach((event: any) => {
          console.log(`- Event: ${event.event}`);
          console.log(`  Game: ${event.properties?.gameTitle || 'Unknown'}`);
          console.log(`  Response: ${event.properties?.response || 'Unknown'}`);
          console.log(`  Time: ${new Date(event.timestamp).toLocaleString()}`);
        });
      } else {
        console.log('❌ No purchase intent events found in queue');
      }
      
      return events;
    } else {
      console.log('📭 No events in queue');
      return [];
    }
  } catch {
    console.error('Error checking analytics queue:', error);
    return [];
  }
};

// Auto-run when imported
checkAnalyticsQueue();