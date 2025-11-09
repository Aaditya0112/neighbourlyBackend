import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

const initializeFirebaseAdmin = () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }
  return admin;
};

export const firebaseAdmin = initializeFirebaseAdmin();