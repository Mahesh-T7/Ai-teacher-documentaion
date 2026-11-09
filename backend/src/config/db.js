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
    console.info(`[MongoDB Info] Note: To use MongoDB Atlas, set your MONGODB_URI in backend/.env:`);
    console.info(`[MongoDB Info] MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/teacher_portal?retryWrites=true&w=majority`);
    console.log(`[Database System] Active storage mode: Local fallback store (Development/Test Mode).`);
    return null;
  }
};

export const getDBStatus = () => {
  const isConn = mongoose.connection.readyState === 1;
  return {
    isConnected: isConn,
    isMemoryFallback: !isConn,
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/teacher_portal',
  };
};
