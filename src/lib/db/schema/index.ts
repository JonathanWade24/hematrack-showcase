import * as tables from './schema';
import * as relations from './relations';

// Combine all exports from schema.ts and relations.ts
const schema = { ...tables, ...relations };

export default schema;

// Optionally re-export individual tables/relations if needed directly elsewhere
export * from './schema';
export * from './relations'; 