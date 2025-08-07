/**
 * Helper utilities for BottomSheet animations and calculations
 */

export const calculateSnapPoint = (
  currentY: number,
  velocity: number,
  minY: number,
  maxY: number,
  snapRatio: number[] = [0, 0.5, 1]
): number => {
  const totalDistance = maxY - minY;
  const currentRatio = (maxY - currentY) / totalDistance;
  
  // Strong velocity overrides position
  if (Math.abs(velocity) > 0.5) {
    return velocity > 0 ? maxY : minY;
  }
  
  // Find closest snap ratio
  let closestRatio = snapRatio[0];
  let minDiff = Math.abs(currentRatio - snapRatio[0]);
  
  for (const ratio of snapRatio) {
    const diff = Math.abs(currentRatio - ratio);
    if (diff < minDiff) {
      minDiff = diff;
      closestRatio = ratio;
    }
  }
  
  return maxY - (closestRatio * totalDistance);
};

export const getOrientationAdjustments = (isPortrait: boolean) => ({
  collapsedHeight: isPortrait ? 50 : 40,
  expandedOffset: isPortrait ? 20 : 10,
  tabMargin: isPortrait ? 8 : 4,
  titleSize: isPortrait ? 26 : 22,
});