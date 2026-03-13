import jwt from 'jsonwebtoken';
const JWT_SECRET = "affinite-70-secret-key"; // From server.ts
const token = jwt.sign({ id: 1, email: 'test@example.com', role: 'user' }, JWT_SECRET);
console.log(token);
