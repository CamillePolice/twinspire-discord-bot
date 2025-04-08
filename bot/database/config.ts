export const mongooseConfig = {
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  minPoolSize: 10,
  retryWrites: true,
  retryReads: true,
  serverSelectionTimeoutMS: 15000,
  heartbeatFrequencyMS: 10000,
};
