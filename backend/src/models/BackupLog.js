import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryBackupLogs = [];

const backupLogSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['export', 'preview_restore', 'restore'],
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'success',
    },
    filename: {
      type: String,
      default: '',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    checksum: {
      type: String,
      default: '',
    },
    manifest: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    restoreStrategy: {
      type: String,
      enum: ['merge', 'overwrite', 'none'],
      default: 'none',
    },
    recordsRestored: {
      type: Number,
      default: 0,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const MongooseBackupLog = mongoose.model('BackupLog', backupLogSchema);

export class BackupLog {
  static async create(data) {
    if (getDBStatus().isConnected) {
      return await MongooseBackupLog.create(data);
    }
    const newDoc = {
      _id: new mongoose.Types.ObjectId().toString(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryBackupLogs.unshift(newDoc);
    return newDoc;
  }

  static async find(query = {}) {
    if (getDBStatus().isConnected) {
      return await MongooseBackupLog.find(query).sort({ createdAt: -1 });
    }
    let res = [...memoryBackupLogs];
    if (query.teacherId) {
      res = res.filter((item) => String(item.teacherId) === String(query.teacherId));
    }
    if (query.action) {
      res = res.filter((item) => item.action === query.action);
    }
    return res;
  }

  static async findById(id) {
    if (getDBStatus().isConnected) {
      return await MongooseBackupLog.findById(id);
    }
    return memoryBackupLogs.find((item) => String(item._id) === String(id)) || null;
  }
}
