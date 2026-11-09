import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '../src/models/User.js';

await mongoose.connect('mongodb+srv://mtleagal7_db_user:2kOAtwGMKFDuCJS9@cluster0.v67qwyp.mongodb.net/teacher_portal?retryWrites=true&w=majority');

let user = await User.findOne();
if (!user) {
  user = await User.create({
    fullName: 'Test Teacher',
    email: 'testteacher@example.com',
    password: 'Password@123',
    schoolName: 'Karnataka Public School',
    designation: 'Vocational Trainer',
  });
}

const secret = 'super_secret_jwt_teacher_portal_key_2026_dev_secure';
const token = jwt.sign({ id: user._id.toString(), email: user.email }, secret, { expiresIn: '7d' });

console.log('TOKEN:', token);
console.log('USER_ID:', user._id.toString());
process.exit(0);
