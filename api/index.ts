import { createRequire } from 'module';
import serverless from 'serverless-http';

const require = createRequire(import.meta.url);
const serverModule = require('../dist/server.cjs');

const expressApp = serverModule.default || serverModule;

export default serverless(expressApp);
