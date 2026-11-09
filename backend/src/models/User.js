import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getDBStatus } from '../config/db.js';
import { loadCollection, saveCollection } from '../utils/localDiskStore.js';

// In-memory + persistent fallback collection for offline/development
const initialUsers = loadCollection('users', []);
const memoryUsers = new Map();
initialUsers.forEach((u) => memoryUsers.set(u._id || u.id, u));

const persistUsers = () => {
  saveCollection('users', Array.from(memoryUsers.values()));
};

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Don't return password by default in queries
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: '',
    },
    schoolName: {
      type: String,
      trim: true,
      default: 'Government / Private School',
    },
    designation: {
      type: String,
      trim: true,
      default: 'Secondary School Teacher',
    },
    subjectsTaught: {
      type: [String],
      default: [],
    },
    classesHandled: {
      type: [String],
      default: [],
    },
    preferredLanguage: {
      type: String,
      default: 'English',
    },
    role: {
      type: String,
      enum: ['teacher', 'headmaster', 'admin'],
      default: 'teacher',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
    },
    experienceYears: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // creates createdAt and updatedAt automatically
  }
);

// Hash password before saving in Mongoose
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password helper
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// To JSON transform - safely omit password
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject ? this.toObject() : { ...this };
  delete obj.password;
  return obj;
};

// Compile Mongoose model
const MongoUser = mongoose.model('User', userSchema);

// Hybrid model wrapper that works with both MongoDB Atlas and the offline dev fallback
export class User {
  static async create(userData) {
    const { isMemoryFallback } = getDBStatus();

    if (!isMemoryFallback) {
      try {
        const user = await MongoUser.create(userData);
        const obj = user.toObject();
        delete obj.password;
        return obj;
      } catch (err) {
        // If MongoDB connection fails during operation, throw or fallback
        if (err.name === 'MongooseError' || err.name === 'MongoServerSelectionError') {
          console.warn('[DB Error] Falling back to local store:', err.message);
        } else {
          throw err;
        }
      }
    }

    // In-memory fallback
    const normalizedEmail = userData.email.toLowerCase().trim();
    for (const u of memoryUsers.values()) {
      if (u.email.toLowerCase() === normalizedEmail) {
        const error = new Error('Email address already registered');
        error.code = 11000;
        throw error;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    const id = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    const newUser = {
      _id: id,
      id,
      fullName: userData.fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phoneNumber: userData.phoneNumber || '',
      schoolName: userData.schoolName || 'Government / Private School',
      designation: userData.designation || 'Secondary School Teacher',
      subjectsTaught: Array.isArray(userData.subjectsTaught) ? userData.subjectsTaught : [],
      classesHandled: Array.isArray(userData.classesHandled) ? userData.classesHandled : [],
      preferredLanguage: userData.preferredLanguage || 'English',
      role: userData.role || 'teacher',
      avatarUrl: userData.avatarUrl || '',
      bio: userData.bio || '',
      experienceYears: userData.experienceYears || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memoryUsers.set(id, newUser);
    persistUsers();
    const safeUser = { ...newUser };
    delete safeUser.password;
    return safeUser;
  }

  static async findByEmailWithPassword(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const { isMemoryFallback } = getDBStatus();

    if (!isMemoryFallback) {
      try {
        const user = await MongoUser.findOne({ email: normalizedEmail }).select('+password');
        return user;
      } catch (err) {
        console.warn('[DB Error] Falling back to local store for findByEmail:', err.message);
      }
    }

    // Memory lookup
    for (const u of memoryUsers.values()) {
      if (u.email.toLowerCase() === normalizedEmail) {
        return {
          ...u,
          matchPassword: async (pwd) => bcrypt.compare(pwd, u.password),
          toSafeObject: () => {
            const copy = { ...u };
            delete copy.password;
            return copy;
          },
        };
      }
    }
    return null;
  }

  static async findById(id) {
    const { isMemoryFallback } = getDBStatus();

    if (!isMemoryFallback && mongoose.Types.ObjectId.isValid(id)) {
      try {
        const user = await MongoUser.findById(id).select('-password');
        if (user) return user;
      } catch (err) {
        console.warn('[DB Error] Falling back to local store for findById:', err.message);
      }
    }

    // Memory lookup
    const user = memoryUsers.get(id);
    if (!user) return null;
    const safeUser = { ...user };
    delete safeUser.password;
    return {
      ...safeUser,
      toSafeObject: () => safeUser,
    };
  }

  static async updateById(id, updateData) {
    const { isMemoryFallback } = getDBStatus();

    // Fields allowed to update
    const allowed = [
      'fullName',
      'phoneNumber',
      'schoolName',
      'designation',
      'subjectsTaught',
      'classesHandled',
      'preferredLanguage',
      'bio',
      'experienceYears',
    ];

    const cleanUpdate = {};
    for (const key of allowed) {
      if (updateData[key] !== undefined) {
        cleanUpdate[key] = updateData[key];
      }
    }
    cleanUpdate.updatedAt = new Date();

    if (!isMemoryFallback && mongoose.Types.ObjectId.isValid(id)) {
      try {
        const updated = await MongoUser.findByIdAndUpdate(id, cleanUpdate, {
          returnDocument: 'after',
          runValidators: true,
        }).select('-password');
        return updated;
      } catch (err) {
        console.warn('[DB Error] Falling back to local store for updateById:', err.message);
      }
    }

    const existing = memoryUsers.get(id);
    if (!existing) return null;

    const merged = {
      ...existing,
      ...cleanUpdate,
      updatedAt: new Date(),
    };
    memoryUsers.set(id, merged);
    persistUsers();

    const safeObj = { ...merged };
    delete safeObj.password;
    return safeObj;
  }
}

export default MongoUser;
