import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
const db = new Database('affinite70.db');
const password = await bcrypt.hash('password123', 10);
db.prepare('INSERT INTO users (email, password, role, status, email_verified) VALUES (?, ?, ?, ?, ?)').run('test@example.com', password, 'user', 'active', 1);
console.log('User created');
