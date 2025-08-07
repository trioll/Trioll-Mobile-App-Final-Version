// Game images from S3 bucket
// Using actual game assets from trioll-prod-games-us-east-1 S3 bucket

export const gamePlaceholderImages: Record<string, string> = {
  'evolution-runner-001': 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Evolution-Runner/thumbnail.png',
  'demo-adventure-001': 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Island-Quest/thumbnail.png',
  'demo-puzzle-001': 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Mind-Bender/thumbnail.png',
  'game-004': 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Puzzle-Master/thumbnail.png',
  'game-005': 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Racing-Thunder/thumbnail.png',
  'demo-sports-001': 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Robo-Soccer/thumbnail.png',
  'game-003': 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Space-Adventure/thumbnail.png',
  'demo-racing-001': 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Speed-Racer/thumbnail.png',
  'demo-strategy-001': 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Tower-Defense/thumbnail.png',
};

// Fallback for any game without a specific placeholder
// Using a generic game thumbnail from S3
export const defaultGamePlaceholder = 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/default-game-thumbnail.png';