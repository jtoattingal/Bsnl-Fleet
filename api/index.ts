import app from '../server';
import { initDatabase } from '../server/db';

let initialized = false;

export default async function handler(req: any, res: any) {
  if (!initialized) {
    try {
      await initDatabase();
      initialized = true;
    } catch (err) {
      console.error('Vercel serverless DB init error:', err);
    }
  }
  return app(req, res);
}
