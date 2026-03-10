import express from "express";
import http, { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import multer from "multer";
import webpush from "web-push";
import { fileURLToPath } from "url";
import { addDays, isAfter } from "date-fns";
import dotenv from "dotenv";
import { exec } from "child_process";
import compression from "compression";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const db = new Database("affinite70.db");
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "affinite-70-secret-key";
console.log("JWT_SECRET starts with:", JWT_SECRET.substring(0, 5));
const OWNER_EMAIL = "sombiniainalorie@gmail.com";

// Push Notifications Config
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || "BNMmh9F5GasjynQfeGa6YMvVwJgBGEH0zE_HgjfXXCwV9SBsq86N1xcGNzhcOOb2RN5Ka4pUIccfeIfZuc9Z838",
  privateKey: process.env.VAPID_PRIVATE_KEY || "z9aNeU6B3MINrn9n5tK1eMd-8tKLeWgNozRRESTZxvk"
};

webpush.setVapidDetails(
  'mailto:support@affinity70.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const sendPushNotification = (userId: number, payload: any) => {
  const subs = db.prepare("SELECT subscription FROM push_subscriptions WHERE user_id = ?").all(userId);
  subs.forEach((row: any) => {
    try {
      const subscription = JSON.parse(row.subscription);
      webpush.sendNotification(subscription, JSON.stringify(payload))
        .catch(err => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            db.prepare("DELETE FROM push_subscriptions WHERE subscription = ?").run(row.subscription);
          }
        });
    } catch (e) {}
  });
};

// Database Initialization
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'inactive', -- inactive, pending, active, expired
    is_hidden INTEGER DEFAULT 0,
    email_verified INTEGER DEFAULT 0,
    verification_code TEXT,
    reset_token TEXT,
    reset_token_expires DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Add reset token columns if missing
try {
  db.prepare("ALTER TABLE users ADD COLUMN reset_token TEXT").run();
  db.prepare("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME").run();
} catch (e) {}

// Migration: Add email verification columns if missing
try {
  db.prepare("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0").run();
  db.prepare("ALTER TABLE users ADD COLUMN verification_code TEXT").run();
} catch (e) {}

// Migration: Add advanced privacy settings if missing
try {
  db.prepare("ALTER TABLE users ADD COLUMN show_age INTEGER DEFAULT 1").run();
  db.prepare("ALTER TABLE users ADD COLUMN show_city INTEGER DEFAULT 1").run();
  db.prepare("ALTER TABLE users ADD COLUMN show_online_status INTEGER DEFAULT 1").run();
  db.prepare("ALTER TABLE users ADD COLUMN show_read_receipts INTEGER DEFAULT 1").run();
} catch (e) {}

// Migration: Add bio to profiles if missing
try {
  db.prepare("ALTER TABLE profiles ADD COLUMN bio TEXT").run();
} catch (e) {
  // Column might already exist
}

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT NOT NULL,
    height INTEGER,
    hobbies TEXT,
    bio TEXT,
    talent TEXT,
    religion TEXT,
    ethnicity TEXT,
    hair_type TEXT,
    age INTEGER,
    skin_color TEXT,
    physique TEXT,
    jealous TEXT,
    personality TEXT,
    has_children TEXT,
    occupation_status TEXT,
    city TEXT,
    orientation TEXT,
    fun_question TEXT,
    serious_question TEXT,
    photo_url TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS preferences (
    user_id INTEGER PRIMARY KEY,
    min_age INTEGER,
    max_age INTEGER,
    height INTEGER,
    hobbies TEXT,
    religion TEXT,
    ethnicity TEXT,
    hair_type TEXT,
    skin_color TEXT,
    physique TEXT,
    occupation_status TEXT,
    city TEXT,
    has_children TEXT,
    jealous TEXT,
    personality TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    mvola_number TEXT,
    transaction_id TEXT,
    reference TEXT,
    proof_url TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    amount INTEGER DEFAULT 2000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    target_id INTEGER,
    type TEXT, -- 'like' or 'pass'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(target_id) REFERENCES users(id),
    UNIQUE(user_id, target_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    user_id INTEGER PRIMARY KEY,
    start_date DATETIME,
    end_date DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1_id INTEGER,
    user2_id INTEGER,
    score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user1_id, user2_id)
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subscription TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS question_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asker_id INTEGER,
    answerer_id INTEGER,
    fun_answer TEXT,
    serious_answer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(asker_id) REFERENCES users(id),
    FOREIGN KEY(answerer_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blocker_id INTEGER,
    blocked_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blocker_id, blocked_id),
    FOREIGN KEY(blocker_id) REFERENCES users(id),
    FOREIGN KEY(blocked_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    target_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, target_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(target_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    url TEXT NOT NULL,
    is_primary INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER,
    reported_id INTEGER,
    reason TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(reporter_id) REFERENCES users(id),
    FOREIGN KEY(reported_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_users_status_hidden ON users(status, is_hidden);
  CREATE INDEX IF NOT EXISTS idx_profiles_gender_orientation ON profiles(gender, orientation);
  CREATE INDEX IF NOT EXISTS idx_likes_user_target ON likes(user_id, target_id);
  CREATE INDEX IF NOT EXISTS idx_blocks_blocker_blocked ON blocks(blocker_id, blocked_id);

  CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Ensure the main user is admin
try {
  db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(OWNER_EMAIL);
} catch (e) {
  console.log("Could not set admin role (user might not exist yet)");
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(compression());
app.use(express.json());

// Health check endpoint for keep-alive
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/uploads", express.static("uploads", {
  maxAge: '1d',
  etag: true
}));

// Multer for file uploads
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Middleware for Auth
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    
    // Check for expiration on every request for authenticated users
    const now = new Date();
    const sub = db.prepare("SELECT end_date FROM subscriptions WHERE user_id = ?").get(req.user.id) as any;
    if (sub && now > new Date(sub.end_date)) {
      db.prepare("UPDATE users SET status = 'expired' WHERE id = ?").run(req.user.id);
    }
    
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Middleware to restrict access to core features
const requireActive = (req: any, res: any, next: any) => {
  const user = db.prepare("SELECT status, role, email_verified FROM users WHERE id = ?").get(req.user.id) as any;
  if (user.role === 'admin') return next(); // Admins are always active
  if (!user.email_verified) {
    return res.status(403).json({ error: "Email verification required", emailVerified: false });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ error: "Subscription required or expired", status: user.status });
  }
  next();
};

// --- AUTH ROUTES ---
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  try {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    const role = (userCount.count === 0 || email === OWNER_EMAIL) ? 'admin' : 'user';
    const status = role === 'admin' ? 'active' : 'inactive';
    const emailVerified = 1; // Always verified
    
    const result = db.prepare("INSERT INTO users (email, password, role, status, email_verified, verification_code) VALUES (?, ?, ?, ?, ?, ?)").run(email, hashedPassword, role, status, emailVerified, verificationCode);
    
    // In a real app, send email here. For now, we'll log it.
    console.log(`Verification code for ${email}: ${verificationCode}`);
    
    const token = jwt.sign({ id: result.lastInsertRowid, email, role }, JWT_SECRET);
    res.json({ token, userId: result.lastInsertRowid, role, status, emailVerified });
  } catch (e) {
    res.status(400).json({ error: "Email already exists" });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as any;
  if (!user) {
    // For security, don't reveal if email exists
    return res.json({ success: true, message: "Si cet email existe, un lien de réinitialisation a été envoyé." });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expires = addDays(new Date(), 1).toISOString(); // 24 hours

  db.prepare("UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?").run(resetToken, expires, user.id);

  // In a real app, send email here. For now, we'll log it.
  console.log(`Reset link for ${email}: /reset-password?token=${resetToken}`);
  
  res.json({ success: true, message: "Si cet email existe, un lien de réinitialisation a été envoyé." });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { token, password } = req.body;
  const user = db.prepare("SELECT id, reset_token_expires FROM users WHERE reset_token = ?").get(token) as any;
  
  if (!user || isAfter(new Date(), new Date(user.reset_token_expires))) {
    return res.status(400).json({ error: "Lien invalide ou expiré" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  db.prepare("UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?").run(hashedPassword, user.id);

  res.json({ success: true, message: "Mot de passe réinitialisé avec succès." });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
  res.json({ token, userId: user.id, role: user.role, status: user.status, emailVerified: 1 });
});

// --- PUSH NOTIFICATION ROUTES ---
app.post("/api/push/subscribe", authenticate, (req: any, res) => {
  const userId = req.user.id;
  const { subscription } = req.body;
  
  db.prepare("INSERT OR REPLACE INTO push_subscriptions (user_id, subscription) VALUES (?, ?)")
    .run(userId, JSON.stringify(subscription));
    
  res.json({ success: true });
});

app.post("/api/push/unsubscribe", authenticate, (req: any, res) => {
  const userId = req.user.id;
  const { subscription } = req.body;
  
  db.prepare("DELETE FROM push_subscriptions WHERE user_id = ? AND subscription = ?")
    .run(userId, JSON.stringify(subscription));
    
  res.json({ success: true });
});

app.get("/api/push/key", (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// --- PROFILE ROUTES ---
app.post("/api/profile", authenticate, upload.single('photo'), (req: any, res) => {
  const profile = req.body;
  const userId = req.user.id;
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO profiles (
      user_id, first_name, last_name, gender, height, hobbies, bio, talent, religion,
      ethnicity, hair_type, age, skin_color, physique, jealous, personality,
      has_children, occupation_status, city, orientation, fun_question, serious_question,
      photo_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    userId, profile.firstName, profile.lastName, profile.gender, profile.height,
    profile.hobbies, profile.bio, profile.talent, profile.religion, profile.ethnicity,
    profile.hairType, profile.age, profile.skinColor, profile.physique,
    profile.jealous, profile.personality, profile.hasChildren,
    profile.occupationStatus, profile.city, profile.orientation,
    profile.funQuestion, profile.seriousQuestion, photoUrl || profile.photoUrl
  );

  if (photoUrl) {
    db.prepare("UPDATE user_photos SET is_primary = 0 WHERE user_id = ?").run(userId);
    db.prepare("INSERT INTO user_photos (user_id, url, is_primary) VALUES (?, ?, 1)").run(userId, photoUrl);
  }
  
  res.json({ success: true });
});

app.post("/api/profile/photo", authenticate, upload.single("photo"), (req: any, res) => {
  const userId = req.user.id;
  const photoUrl = `/uploads/${req.file.filename}`;
  
  // Update main profile photo
  db.prepare("UPDATE profiles SET photo_url = ? WHERE user_id = ?").run(photoUrl, userId);
  
  // Also add to user_photos and make it primary
  db.prepare("UPDATE user_photos SET is_primary = 0 WHERE user_id = ?").run(userId);
  db.prepare("INSERT INTO user_photos (user_id, url, is_primary) VALUES (?, ?, 1)").run(userId, photoUrl);
  
  res.json({ success: true, photoUrl });
});

app.get("/api/photos", authenticate, (req: any, res) => {
  const photos = db.prepare("SELECT * FROM user_photos WHERE user_id = ? ORDER BY is_primary DESC, created_at DESC").all(req.user.id);
  res.json(photos);
});

app.post("/api/photos", authenticate, upload.single("photo"), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  
  const userId = req.user.id;
  const photoUrl = `/uploads/${req.file.filename}`;
  
  // Check if user has any photos
  const existingPhotos = db.prepare("SELECT COUNT(*) as count FROM user_photos WHERE user_id = ?").get(userId) as any;
  const isPrimary = existingPhotos.count === 0 ? 1 : 0;
  
  const result = db.prepare("INSERT INTO user_photos (user_id, url, is_primary) VALUES (?, ?, ?)").run(userId, photoUrl, isPrimary);
  
  if (isPrimary) {
    db.prepare("UPDATE profiles SET photo_url = ? WHERE user_id = ?").run(photoUrl, userId);
  }
  
  res.json({ 
    id: result.lastInsertRowid,
    url: photoUrl,
    is_primary: isPrimary
  });
});

app.delete("/api/photos/:id", authenticate, (req: any, res) => {
  const userId = req.user.id;
  const photoId = req.params.id;
  
  const photo = db.prepare("SELECT * FROM user_photos WHERE id = ? AND user_id = ?").get(photoId, userId) as any;
  if (!photo) return res.status(404).json({ error: "Photo not found" });
  
  db.prepare("DELETE FROM user_photos WHERE id = ?").run(photoId);
  
  // If we deleted the primary photo, pick another one to be primary
  if (photo.is_primary) {
    const nextPhoto = db.prepare("SELECT * FROM user_photos WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(userId) as any;
    if (nextPhoto) {
      db.prepare("UPDATE user_photos SET is_primary = 1 WHERE id = ?").run(nextPhoto.id);
      db.prepare("UPDATE profiles SET photo_url = ? WHERE user_id = ?").run(nextPhoto.url, userId);
    } else {
      db.prepare("UPDATE profiles SET photo_url = NULL WHERE user_id = ?").run(userId);
    }
  }
  
  res.json({ success: true });
});

app.post("/api/photos/:id/primary", authenticate, (req: any, res) => {
  const userId = req.user.id;
  const photoId = req.params.id;
  
  const photo = db.prepare("SELECT * FROM user_photos WHERE id = ? AND user_id = ?").get(photoId, userId) as any;
  if (!photo) return res.status(404).json({ error: "Photo not found" });
  
  db.prepare("UPDATE user_photos SET is_primary = 0 WHERE user_id = ?").run(userId);
  db.prepare("UPDATE user_photos SET is_primary = 1 WHERE id = ?").run(photoId);
  db.prepare("UPDATE profiles SET photo_url = ? WHERE user_id = ?").run(photo.url, userId);
  
  res.json({ success: true });
});

app.post("/api/preferences", authenticate, (req: any, res) => {
  const prefs = req.body;
  const userId = req.user.id;
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO preferences (
      user_id, min_age, max_age, height, hobbies, religion, ethnicity,
      hair_type, skin_color, physique, occupation_status, city, has_children,
      jealous, personality
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    userId, prefs.minAge, prefs.maxAge, prefs.height, prefs.hobbies,
    prefs.religion, prefs.ethnicity, prefs.hairType, prefs.skinColor,
    prefs.physique, prefs.occupationStatus, prefs.city, prefs.hasChildren,
    prefs.jealous, prefs.personality
  );
  
  res.json({ success: true });
});

app.get("/api/me", authenticate, (req: any, res) => {
  const userId = req.user.id;
  const user = db.prepare("SELECT id, email, role, status, is_hidden, show_age, show_city, show_online_status, show_read_receipts FROM users WHERE id = ?").get(userId);
  const profile = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId);
  const prefs = db.prepare("SELECT * FROM preferences WHERE user_id = ?").get(userId);
  res.json({ user, profile, prefs });
});

app.post("/api/privacy/settings", authenticate, (req: any, res) => {
  const { show_age, show_city, show_online_status, show_read_receipts } = req.body;
  try {
    db.prepare(`
      UPDATE users 
      SET show_age = ?, show_city = ?, show_online_status = ?, show_read_receipts = ? 
      WHERE id = ?
    `).run(
      show_age ? 1 : 0, 
      show_city ? 1 : 0, 
      show_online_status ? 1 : 0, 
      show_read_receipts ? 1 : 0, 
      req.user.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update privacy settings" });
  }
});

app.get("/api/profile/:id", authenticate, (req: any, res) => {
  const targetId = req.params.id;
  const currentUserId = req.user.id;
  
  const targetUser = db.prepare("SELECT show_age, show_city, show_online_status FROM users WHERE id = ?").get(targetId) as any;
  if (!targetUser) return res.status(404).json({ error: "User not found" });

  const profile = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(targetId) as any;
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  
  // Apply privacy settings
  if (!targetUser.show_age) delete profile.age;
  if (!targetUser.show_city) profile.city = "Confidentiel";
  profile.show_online_status = !!targetUser.show_online_status;

  const myProfile = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(currentUserId) as any;
  const myPrefs = db.prepare("SELECT * FROM preferences WHERE user_id = ?").get(currentUserId) as any;
  const targetPrefs = db.prepare("SELECT * FROM preferences WHERE user_id = ?").get(targetId) as any;

  if (myProfile && myPrefs && targetPrefs) {
    profile.compatibility = calculateCompatibility(myProfile, myPrefs, profile, targetPrefs);
  } else {
    profile.compatibility = 0;
  }
  
  const isFavorite = db.prepare("SELECT id FROM favorites WHERE user_id = ? AND target_id = ?").get(currentUserId, targetId);
  profile.isFavorite = !!isFavorite;
  
  const favoritedMe = db.prepare("SELECT id FROM favorites WHERE user_id = ? AND target_id = ?").get(targetId, currentUserId);
  profile.isMutualFavorite = !!isFavorite && !!favoritedMe;
  
  const photos = db.prepare("SELECT * FROM user_photos WHERE user_id = ? ORDER BY is_primary DESC, created_at DESC").all(targetId);
  profile.photos = photos;
  
  res.set("Cache-Control", "private, max-age=60"); // Cache for 1 minute
  res.json(profile);
});

// --- FAVORITES ---
app.post("/api/favorites/:id", authenticate, (req: any, res) => {
  const userId = req.user.id;
  const targetId = req.params.id;
  if (userId == targetId) return res.status(400).json({ error: "Cannot favorite yourself" });
  try {
    db.prepare("INSERT INTO favorites (user_id, target_id) VALUES (?, ?)").run(userId, targetId);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Already in favorites" });
  }
});

app.delete("/api/favorites/:id", authenticate, (req: any, res) => {
  const userId = req.user.id;
  const targetId = req.params.id;
  db.prepare("DELETE FROM favorites WHERE user_id = ? AND target_id = ?").run(userId, targetId);
  res.json({ success: true });
});

app.get("/api/favorites", authenticate, (req: any, res) => {
  const userId = req.user.id;
  const myProfile = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId) as any;
  const myPrefs = db.prepare("SELECT * FROM preferences WHERE user_id = ?").get(userId) as any;

  const favorites = db.prepare(`
    SELECT p.*, f.created_at as favorited_at,
           u.show_age, u.show_city, u.show_online_status,
           pr.min_age as pref_min_age, pr.max_age as pref_max_age, pr.height as pref_height, 
           pr.hobbies as pref_hobbies, pr.religion as pref_religion, pr.ethnicity as pref_ethnicity, 
           pr.hair_type as pref_hair_type, pr.skin_color as pref_skin_color, pr.physique as pref_physique, 
           pr.occupation_status as pref_occupation_status, pr.city as pref_city, pr.has_children as pref_has_children, 
           pr.jealous as pref_jealous, pr.personality as pref_personality
    FROM profiles p
    JOIN favorites f ON p.user_id = f.target_id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN preferences pr ON p.user_id = pr.user_id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(userId);

  const results = favorites.map((otherProfile: any) => {
    const otherPrefs = {
      min_age: otherProfile.pref_min_age,
      max_age: otherProfile.pref_max_age,
      height: otherProfile.pref_height,
      hobbies: otherProfile.pref_hobbies,
      religion: otherProfile.pref_religion,
      ethnicity: otherProfile.pref_ethnicity,
      hair_type: otherProfile.pref_hair_type,
      skin_color: otherProfile.pref_skin_color,
      physique: otherProfile.pref_physique,
      occupation_status: otherProfile.pref_occupation_status,
      city: otherProfile.pref_city,
      has_children: otherProfile.pref_has_children,
      jealous: otherProfile.pref_jealous,
      personality: otherProfile.pref_personality
    };
    const score = calculateCompatibility(myProfile, myPrefs, otherProfile, otherPrefs);
    
    // Apply privacy settings
    if (!otherProfile.show_age) delete otherProfile.age;
    if (!otherProfile.show_city) otherProfile.city = "Confidentiel";
    
    return { ...otherProfile, compatibility: score };
  });

  res.json(results);
});

// --- BLOCKING ---
app.post("/api/block", authenticate, (req: any, res) => {
  const blockerId = req.user.id;
  const { blockedId } = req.body;
  if (blockerId === blockedId) return res.status(400).json({ error: "Cannot block yourself" });
  try {
    db.prepare("INSERT INTO blocks (blocker_id, blocked_id) VALUES (?, ?)").run(blockerId, blockedId);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Already blocked" });
  }
});

app.post("/api/unblock", authenticate, (req: any, res) => {
  const blockerId = req.user.id;
  const { blockedId } = req.body;
  db.prepare("DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?").run(blockerId, blockedId);
  res.json({ success: true });
});

app.get("/api/blocks", authenticate, (req: any, res) => {
  const userId = req.user.id;
  const blockedUsers = db.prepare(`
    SELECT p.* FROM profiles p
    JOIN blocks b ON p.user_id = b.blocked_id
    WHERE b.blocker_id = ?
  `).all(userId);
  res.json(blockedUsers);
});

app.post("/api/privacy/hide", authenticate, (req: any, res) => {
  const userId = req.user.id;
  const { isHidden } = req.body;
  db.prepare("UPDATE users SET is_hidden = ? WHERE id = ?").run(isHidden ? 1 : 0, userId);
  res.json({ success: true });
});

app.post("/api/report", authenticate, (req: any, res) => {
  const reporterId = req.user.id;
  const { reportedId, reason, details } = req.body;
  if (reporterId === reportedId) return res.status(400).json({ error: "Cannot report yourself" });
  
  db.prepare("INSERT INTO reports (reporter_id, reported_id, reason, details) VALUES (?, ?, ?, ?)").run(reporterId, reportedId, reason, details);
  res.json({ success: true });
});

app.delete("/api/account", authenticate, (req: any, res) => {
  const userId = req.user.id;
  
  // Delete everything related to the user
  db.prepare("DELETE FROM blocks WHERE blocker_id = ? OR blocked_id = ?").run(userId, userId);
  db.prepare("DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?").run(userId, userId);
  db.prepare("DELETE FROM question_answers WHERE asker_id = ? OR answerer_id = ?").run(userId, userId);
  db.prepare("DELETE FROM matches WHERE user1_id = ? OR user2_id = ?").run(userId, userId);
  db.prepare("DELETE FROM subscriptions WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM transactions WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM preferences WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM profiles WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  
  res.json({ success: true });
});

// --- COMPATIBILITY ALGORITHM ---
function calculateCompatibility(p1: any, pref1: any, p2: any, pref2: any) {
  let score = 0;
  
  const check = (val: any, pref: any, weight: number) => {
    if (pref === 'Indifférent' || val === pref) return weight;
    return 0;
  };

  // Weights
  const weights = {
    religion: 10,
    age: 15,
    city: 10,
    occupation: 10,
    physique: 10,
    hobbies: 10,
    ethnicity: 10,
    jealous: 5,
    personality: 5,
    others: 15
  };

  // 1. Religion (10%)
  score += check(p2.religion, pref1.religion, weights.religion);
  
  // 2. Age (15%)
  if (p2.age >= pref1.min_age && p2.age <= pref1.max_age) score += weights.age;
  
  // 3. City (10%)
  score += check(p2.city, pref1.city, weights.city);
  
  // 4. Occupation (10%)
  score += check(p2.occupation_status, pref1.occupation_status, weights.occupation);
  
  // 5. Physique (10%)
  score += check(p2.physique, pref1.physique, weights.physique);
  
  // 6. Hobbies (10%)
  if (pref1.hobbies === 'Indifférent' || p2.hobbies === pref1.hobbies) score += weights.hobbies;
  
  // 7. Ethnicity (10%)
  score += check(p2.ethnicity, pref1.ethnicity, weights.ethnicity);
  
  // 8. Jealous (5%)
  score += check(p2.jealous, pref1.jealous, weights.jealous);

  // 9. Personality (5%)
  score += check(p2.personality, pref1.personality, weights.personality);

  // 10. Others (15%) - hair type, skin color, children
  let otherScore = 0;
  if (pref1.hair_type === 'Indifférent' || p2.hair_type === pref1.hair_type) otherScore += 5;
  if (pref1.skin_color === 'Indifférent' || p2.skin_color === pref1.skin_color) otherScore += 5;
  if (pref1.has_children === 'Indifférent' || p2.has_children === pref1.has_children) otherScore += 5;
  score += otherScore;

  return score;
}

app.get("/api/discover", authenticate, requireActive, (req: any, res) => {
  const userId = req.user.id;
  const myProfile = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId) as any;
  const myPrefs = db.prepare("SELECT * FROM preferences WHERE user_id = ?").get(userId) as any;

  if (!myProfile || !myPrefs) return res.status(400).json({ error: "Profile incomplete" });

  // Orientation filtering
  let orientationQuery = "";
  if (myProfile.orientation === "Hétéro") {
    orientationQuery = `AND gender != '${myProfile.gender}' AND (orientation = 'Hétéro' OR orientation = 'Bi')`;
  } else if (myProfile.orientation === "Homo") {
    orientationQuery = `AND gender = '${myProfile.gender}' AND (orientation = 'Homo' OR orientation = 'Bi')`;
  } else {
    // Bi can see anyone who is compatible with them
    orientationQuery = `AND (
      (gender = '${myProfile.gender}' AND (orientation = 'Homo' OR orientation = 'Bi')) OR
      (gender != '${myProfile.gender}' AND (orientation = 'Hétéro' OR orientation = 'Bi'))
    )`;
  }

  const potentialMatches = db.prepare(`
    SELECT p.*, u.status, u.show_age, u.show_city, u.show_online_status,
           pr.min_age as pref_min_age, pr.max_age as pref_max_age, pr.height as pref_height, 
           pr.hobbies as pref_hobbies, pr.religion as pref_religion, pr.ethnicity as pref_ethnicity, 
           pr.hair_type as pref_hair_type, pr.skin_color as pref_skin_color, pr.physique as pref_physique, 
           pr.occupation_status as pref_occupation_status, pr.city as pref_city, pr.has_children as pref_has_children, 
           pr.jealous as pref_jealous, pr.personality as pref_personality,
           (SELECT 1 FROM favorites WHERE user_id = ? AND target_id = p.user_id) as is_favorite
    FROM profiles p 
    JOIN users u ON p.user_id = u.id
    LEFT JOIN preferences pr ON p.user_id = pr.user_id
    WHERE p.user_id != ? 
    AND u.status = 'active' 
    AND u.is_hidden = 0
    AND NOT EXISTS (SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = p.user_id)
    AND NOT EXISTS (SELECT 1 FROM blocks WHERE blocker_id = p.user_id AND blocked_id = ?)
    AND NOT EXISTS (SELECT 1 FROM likes WHERE user_id = ? AND target_id = p.user_id)
    ${orientationQuery}
    LIMIT 100
  `).all(userId, userId, userId, userId, userId);

  const results = potentialMatches.map((otherProfile: any) => {
    // Map pref_ fields back to a preference object for calculateCompatibility
    const otherPrefs = {
      min_age: otherProfile.pref_min_age,
      max_age: otherProfile.pref_max_age,
      height: otherProfile.pref_height,
      hobbies: otherProfile.pref_hobbies,
      religion: otherProfile.pref_religion,
      ethnicity: otherProfile.pref_ethnicity,
      hair_type: otherProfile.pref_hair_type,
      skin_color: otherProfile.pref_skin_color,
      physique: otherProfile.pref_physique,
      occupation_status: otherProfile.pref_occupation_status,
      city: otherProfile.pref_city,
      has_children: otherProfile.pref_has_children,
      jealous: otherProfile.pref_jealous,
      personality: otherProfile.pref_personality
    };
    const score = calculateCompatibility(myProfile, myPrefs, otherProfile, otherPrefs);
    
    // Apply privacy settings
    if (!otherProfile.show_age) delete otherProfile.age;
    if (!otherProfile.show_city) otherProfile.city = "Confidentiel";
    
    return { ...otherProfile, compatibility: score };
  }).filter(p => p.compatibility >= 70);

  res.json(results);
});

// --- SUBSCRIPTION & TRANSACTIONS ---
app.post("/api/subscribe", authenticate, upload.single("proof"), (req: any, res) => {
  const { mvolaNumber, transactionId, reference } = req.body;
  const userId = req.user.id;
  const proofUrl = req.file ? `/uploads/${req.file.filename}` : "";

  db.prepare(`
    INSERT INTO transactions (user_id, mvola_number, transaction_id, reference, proof_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, mvolaNumber, transactionId, reference, proofUrl);

  db.prepare("UPDATE users SET status = 'pending' WHERE id = ?").run(userId);

  res.json({ success: true });
});

// Admin routes
app.get("/api/admin/transactions", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const txs = db.prepare(`
    SELECT t.*, u.email, p.first_name, p.last_name 
    FROM transactions t 
    JOIN users u ON t.user_id = u.id 
    JOIN profiles p ON t.user_id = p.user_id
    WHERE t.status = 'pending'
  `).all();
  res.json(txs);
});

app.post("/api/admin/approve", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  try {
    const { transactionId, userId } = req.body;
    if (!transactionId || !userId) {
      return res.status(400).json({ error: "Missing transactionId or userId" });
    }

    db.transaction(() => {
      db.prepare("UPDATE transactions SET status = 'approved' WHERE id = ?").run(transactionId);
      db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(userId);
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 30);
      
      db.prepare(`
        INSERT OR REPLACE INTO subscriptions (user_id, start_date, end_date)
        VALUES (?, ?, ?)
      `).run(userId, startDate.toISOString(), endDate.toISOString());

      // Create notification
      const msg = "✨ Merveilleuse nouvelle ! Votre accès à l'univers Affinity70 a été validé. Une nouvelle aventure commence pour vous dès maintenant. Profitez de vos 30 jours d'exception.";
      db.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)").run(userId, msg);
      
      // Send Push
      sendPushNotification(userId, {
        title: "L'aventure commence ✨",
        body: msg,
        url: "/discover"
      });
    })();

    res.json({ success: true });
  } catch (err) {
    console.error("[Admin Approve Error]", err);
    res.status(500).json({ error: "Failed to approve transaction" });
  }
});

app.post("/api/admin/reject", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  try {
    const { transactionId } = req.body;
    if (!transactionId) {
      return res.status(400).json({ error: "Missing transactionId" });
    }
    db.prepare("UPDATE transactions SET status = 'rejected' WHERE id = ?").run(transactionId);
    res.json({ success: true });
  } catch (err) {
    console.error("[Admin Reject Error]", err);
    res.status(500).json({ error: "Failed to reject transaction" });
  }
});

app.get("/api/admin/reports", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const reports = db.prepare(`
    SELECT r.*, 
           p_reporter.first_name as reporter_name, 
           p_reported.first_name as reported_name,
           u_reported.status as reported_status,
           (SELECT COUNT(*) FROM reports WHERE reported_id = r.reported_id) as report_count
    FROM reports r
    JOIN profiles p_reporter ON r.reporter_id = p_reporter.user_id
    JOIN profiles p_reported ON r.reported_id = p_reported.user_id
    JOIN users u_reported ON r.reported_id = u_reported.id
    GROUP BY r.reported_id
    HAVING report_count >= 1
    ORDER BY report_count DESC
  `).all();
  res.json(reports);
});

app.post("/api/admin/restrict", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const { userId, status } = req.body; // status can be 'inactive' or 'active'
  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, userId);
  res.json({ success: true });
});

// --- LIKES & NOTIFICATIONS ---

app.post("/api/likes", authenticate, (req: any, res) => {
  const { targetId, type } = req.body;
  try {
    db.prepare(`
      INSERT OR REPLACE INTO likes (user_id, target_id, type)
      VALUES (?, ?, ?)
    `).run(req.user.id, targetId, type);

    // If it's a like, check for match
    if (type === 'like') {
      const match = db.prepare("SELECT * FROM likes WHERE user_id = ? AND target_id = ? AND type = 'like'")
        .get(targetId, req.user.id);
      
      if (match) {
        // Get names for better notifications
        const myProfile = db.prepare("SELECT first_name FROM profiles WHERE user_id = ?").get(req.user.id) as any;
        const targetProfile = db.prepare("SELECT first_name FROM profiles WHERE user_id = ?").get(targetId) as any;

        // Create notifications for both
        const msg1 = `C'est un match avec ${targetProfile.first_name} ! Vous avez une nouvelle affinité.`;
        const msg2 = `C'est un match avec ${myProfile.first_name} ! Vous avez une nouvelle affinité.`;

        db.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)").run(req.user.id, msg1);
        db.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)").run(targetId, msg2);

        // Emit real-time notifications
        io.to(`user-${req.user.id}`).emit("newNotification", { message: msg1, created_at: new Date().toISOString() });
        io.to(`user-${targetId}`).emit("newNotification", { message: msg2, created_at: new Date().toISOString() });

        // Send Push Notifications
        sendPushNotification(req.user.id, {
          title: "Nouveau Match !",
          body: msg1,
          url: `/profile/${targetId}`
        });
        sendPushNotification(targetId, {
          title: "Nouveau Match !",
          body: msg2,
          url: `/profile/${req.user.id}`
        });

        return res.json({ success: true, match: true });
      }
    }

    res.json({ success: true, match: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to process like" });
  }
});

app.get("/api/notifications", authenticate, (req: any, res) => {
  const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20")
    .all(req.user.id);
  res.json(notifications);
});

app.post("/api/notifications/read", authenticate, (req: any, res) => {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(req.user.id);
  res.json({ success: true });
});

// --- SUGGESTIONS ---
app.post("/api/suggestions", authenticate, (req: any, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Content required" });
  db.prepare("INSERT INTO suggestions (user_id, content) VALUES (?, ?)").run(req.user.id, content);
  res.json({ success: true });
});

app.get("/api/admin/suggestions", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const suggestions = db.prepare(`
    SELECT s.*, p.first_name, p.last_name, u.email
    FROM suggestions s
    JOIN users u ON s.user_id = u.id
    JOIN profiles p ON s.user_id = p.user_id
    ORDER BY s.created_at DESC
  `).all();
  res.json(suggestions);
});

// --- MESSAGING ---
app.get("/api/conversations", authenticate, requireActive, (req: any, res) => {
  const userId = req.user.id;
  const conversations = db.prepare(`
    SELECT 
      u.id as user_id,
      p.first_name,
      p.photo_url,
      m.content as last_message,
      m.created_at as last_message_time
    FROM users u
    JOIN profiles p ON u.id = p.user_id
    JOIN (
      SELECT 
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_id,
        MAX(created_at) as max_created_at
      FROM messages
      WHERE sender_id = ? OR receiver_id = ?
      GROUP BY other_id
    ) last_msgs ON u.id = last_msgs.other_id
    JOIN messages m ON (
      (m.sender_id = ? AND m.receiver_id = u.id) OR (m.sender_id = u.id AND m.receiver_id = ?)
    ) AND m.created_at = last_msgs.max_created_at
    ORDER BY m.created_at DESC
  `).all(userId, userId, userId, userId, userId);
  res.json(conversations);
});

app.get("/api/messages/:otherId", authenticate, requireActive, (req: any, res) => {
  const userId = req.user.id;
  const otherId = req.params.otherId;

  // Check if blocked
  const isBlocked = db.prepare("SELECT id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)").get(userId, otherId, otherId, userId);
  if (isBlocked) return res.status(403).json({ error: "User is blocked", isBlocked: true });

  const msgs = db.prepare(`
    SELECT * FROM messages 
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
  `).all(userId, otherId, otherId, userId);
  res.json(msgs);
});

// Socket.io for Real-time chat
io.on("connection", (socket) => {
  socket.on("join", (userId) => {
    socket.join(`user-${userId}`);
  });

  socket.on("sendMessage", (data) => {
    const { senderId, receiverId, content } = data;
    
    // Check if blocked or expired before saving/emitting
    const sender = db.prepare("SELECT status, role FROM users WHERE id = ?").get(senderId) as any;
    if (sender.role !== 'admin' && sender.status !== 'active') return;

    const isBlocked = db.prepare("SELECT id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)").get(senderId, receiverId, receiverId, senderId);
    if (isBlocked) return;

    db.prepare("INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)").run(senderId, receiverId, content);
    io.to(`user-${receiverId}`).emit("newMessage", data);

    // Send Push Notification
    const senderProfile = db.prepare("SELECT first_name FROM profiles WHERE user_id = ?").get(senderId) as any;
    sendPushNotification(receiverId, {
      title: `Nouveau message de ${senderProfile?.first_name || 'Affinity70'}`,
      body: content.length > 50 ? content.substring(0, 47) + "..." : content,
      url: `/messages/${senderId}`
    });
  });
});

// --- VITE MIDDLEWARE ---
console.log(`[Server] Initializing in ${process.env.NODE_ENV || 'development'} mode...`);
if (process.env.NODE_ENV !== "production") {
  try {
    console.log("[Server] Starting Vite in middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Server] Vite middleware attached.");
  } catch (err) {
    console.error("[Server] Failed to start Vite middleware:", err);
  }
} else {
  console.log("[Server] Serving static files from dist...");
  // Optimize static serving for production
  app.use(express.static("dist", {
    maxAge: '1y',
    immutable: true,
    index: false
  }));
  
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"), {
      maxAge: '0', // Don't cache index.html
      etag: true
    });
  });
}

// Keep-alive system to prevent cold starts
function startKeepAlive() {
  const APP_URL = process.env.APP_URL;
  if (!APP_URL) {
    console.log("[Keep-Alive] APP_URL not set, skipping self-ping.");
    return;
  }

  console.log(`[Keep-Alive] Starting self-ping for ${APP_URL}`);
  
  setInterval(() => {
    const url = `${APP_URL}/api/health`;
    http.get(url, (res) => {
      console.log(`[Keep-Alive] Ping successful: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error(`[Keep-Alive] Ping failed: ${err.message}`);
    });
  }, 300000); // Every 5 minutes
}

if (process.env.NODE_ENV === "production") {
  startKeepAlive();
}

// Auto-expire subscriptions every hour
function checkExpirations() {
  try {
    const now = new Date().toISOString();
    const expired = db.prepare("SELECT user_id FROM subscriptions WHERE end_date < ?").all(now) as any[];
    if (expired.length > 0) {
      const stmt = db.prepare("UPDATE users SET status = 'expired' WHERE id = ?");
      expired.forEach((sub: any) => {
        stmt.run(sub.user_id);
      });
      console.log(`[Expirations] Updated ${expired.length} users to expired status.`);
    }
  } catch (err) {
    console.error("[Expirations Error]", err);
  }
}
checkExpirations();
setInterval(checkExpirations, 3600000); // Run every hour

// Global Error Listeners for debugging crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection] at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("[Server Error]", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
