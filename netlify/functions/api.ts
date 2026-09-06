import serverless from 'serverless-http';
import app from '../../server';
import { initDatabase } from '../../server/db';

let initialized = false;
const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (!initialized) {
    try {
      await initDatabase();
      initialized = true;
    } catch (err) {
      console.error('Netlify DB init error:', err);
    }
  }
  return serverlessHandler(event, context);
};
