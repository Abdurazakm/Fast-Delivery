const admin = require("firebase-admin");
const { getMessaging } = require("firebase-admin/messaging");
const path = require("path");
const fs = require("fs");

if (!admin.getApps().length) {
  const possiblePaths = [
    path.resolve(__dirname, "../../serviceAccountKey.json"),
    path.resolve(process.cwd(), "serviceAccountKey.json"),
    path.resolve(process.cwd(), "backend/serviceAccountKey.json"),
    "/etc/secrets/serviceAccountKey.json",
  ];
  const serviceAccountPath = possiblePaths.find((p) => fs.existsSync(p));

  if (serviceAccountPath) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.cert(serviceAccount),
    });
    console.log(`✅ Firebase Admin initialized using ${serviceAccountPath}`);

  } else if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    admin.initializeApp({
      credential: admin.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
    console.log("✅ Firebase Admin initialized using environment variables");
  } else {
    console.warn("⚠️ Firebase Admin credentials not found. Push notifications will be disabled.");
  }
}

const messaging = admin.getApps().length ? getMessaging() : null;

module.exports = {
  admin,
  messaging,
};
