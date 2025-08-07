// CommonJS wrapper for ES module Lambda
// This allows us to use AWS SDK v3 without bundling

exports.handler = async (event, context) => {
  // Dynamically import the ES module
  const { handler } = await import('./interactions-dynamodb-v3.js');
  return handler(event, context);
};