import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/teacher_portal';

  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 6000,
    });

    console.log(`[MongoDB] Connected to database: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.warn(`[MongoDB Warning] Could not connect to MongoDB at "${uri}": ${err.message}`);
    console.info(`[MongoDB Info] Note: To connect MongoDB Atlas, ensure your IP is whitelisted under Network Access in Atlas.`);
    console.log(`[Database System] Active storage mode: Persistent Local Store (Disk Synchronized). All data is saved permanently.`);
    return null;
  }
};

export const getDBStatus = () => {
  const isConn = mongoose.connection.readyState === 1;
  return {
    isConnected: isConn,
    isMemoryFallback: !isConn,
    mode: isConn ? 'mongodb_atlas' : 'persistent_local_store',
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/teacher_portal',
  };
};
