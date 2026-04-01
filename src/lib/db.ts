import { Pool, QueryResult, QueryResultRow } from "pg";

if (typeof window !== "undefined") {
    throw new Error("db.ts cannot be imported on the client side");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
        console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    return result;
}

export default pool;
