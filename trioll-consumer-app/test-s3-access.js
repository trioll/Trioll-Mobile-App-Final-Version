// Test S3 access for Evolution Runner game files
// Run this with: node test-s3-access.js

const testUrls = [
  {
    name: 'S3 Direct - index.html',
    url: 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Evolution-Runner/index.html',
  },
  {
    name: 'S3 Direct - thumbnail.png',
    url: 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Evolution-Runner/thumbnail.png',
  },
  {
    name: 'S3 Direct - metadata.json',
    url: 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Evolution-Runner/metadata.json',
  },
  {
    name: 'CloudFront - index.html',
    url: 'https://d33yj1oylm0icp.cloudfront.net/Evolution-Runner/index.html',
  },
];

async function testAccess() {
  
  for (const test of testUrls) {
    try {
      const response = await fetch(test.url, { method: 'HEAD' });
                            } catch (error) {
                            }
  }
}

testAccess();
