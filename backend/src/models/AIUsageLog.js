import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryLogs = [];

const aiUsageLogSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    toolType: {
      type: String,
      required: true,
    },
    promptTokens: {
      type: Number,
      default: 0,
    },
    completionTokens: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Success', 'Failed'],
      default: 'Success',
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const MongoAIUsageLog = mongoose.model('AIUsageLog', aiUsageLogSchema);

export class AIUsageLog {
  static async record(data) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoAIUsageLog.create(data);
      } catch (err) {
        console.warn('[DB Error] AIUsageLog.record fallback:', err.message);
      }
    }
    const log = {
      _id: 'log_' + Date.now(),
      ...data,
      createdAt: new Date(),
    };
    memoryLogs.push(log);
    return log;
  }
}

export default MongoAIUsageLog;
