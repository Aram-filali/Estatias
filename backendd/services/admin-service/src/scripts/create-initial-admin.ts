/*import { AdminModule } from '../admin/admin.module';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Admin, AdminDocument } from '../schema/admin.schema';
import { Model } from 'mongoose';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import serviceAccountJson from '../../config/firebase-service-account.json';

dotenv.config();

const serviceAccount = serviceAccountJson as admin.ServiceAccount;


// Initialize Firebase Admin SDK (only once globally)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function createInitialAdmin() {
  // Create application context for microservice module
  const appContext = await NestFactory.createApplicationContext(AdminModule);
  const adminModel = appContext.get<Model<AdminDocument>>(getModelToken(Admin.name));

  const email = 'estatias.services@gmail.com';
  const password = 'estatias.services2000';
  const role = 'admin';

  try {
    // 1. Check if the admin already exists in MongoDB
    const existingAdmin = await adminModel.findOne({ email });
    if (existingAdmin) {
      console.log('🟡 Admin already exists in MongoDB:', existingAdmin._id);
      return;
    }

    // 2. Check/create Firebase user
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail(email);
      console.log('🟡 Firebase user already exists:', firebaseUser.uid);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        firebaseUser = await admin.auth().createUser({
          email,
          password,
          emailVerified: true,
        });
        console.log('✅ Firebase user created');
      } else {
        throw err;
      }
    }

    // 3. Set custom claims
    await admin.auth().setCustomUserClaims(firebaseUser.uid, { admin: true });
    const hashedPassword = await bcrypt.hash(password, 10);
    // 4. Save admin in MongoDB
    const newAdmin = new adminModel({
      email,
       password: hashedPassword,
      firebaseUid: firebaseUser.uid,
      role,
      isActive: true,
    });

    await newAdmin.save();
    console.log('✅ Admin created in MongoDB:', newAdmin._id);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await appContext.close();
  }
}

createInitialAdmin();*/
