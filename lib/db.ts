import { PrismaClient as PrismaClientNode } from "@prisma/client";
import { PrismaClient as PrismaClientEdge } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

type PrismaClientInstance = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientInstance | undefined;
};

const isEdgeRuntime = typeof (globalThis as { EdgeRuntime?: string }).EdgeRuntime !== "undefined";

function createPrismaClient() {
    const accelerateUrl = process.env.PRISMA_ACCELERATE_URL;
    const directDatabaseUrl = process.env.DIRECT_DATABASE_URL;
    const databaseUrl = process.env.DATABASE_URL;

    if (accelerateUrl) {
        return new PrismaClientEdge({
            datasourceUrl: accelerateUrl,
        }).$extends(withAccelerate());
    }

    if (isEdgeRuntime) {
        throw new Error("PRISMA_ACCELERATE_URL must be set in Edge runtimes.");
    }

    const datasourceUrl = directDatabaseUrl ?? databaseUrl;

    if (!datasourceUrl) {
        throw new Error("Missing DATABASE_URL or DIRECT_DATABASE_URL environment variable.");
    }

    // Add connection pooling parameters to prevent "too many connections" errors
    const urlWithPooling = addConnectionPooling(datasourceUrl);

    return new PrismaClientNode({
        datasources: {
            db: { url: urlWithPooling },
        },
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
}

/**
 * Adds connection pooling parameters to the database URL if they don't already exist.
 * This prevents "too many connections" errors by limiting the connection pool size.
 */
function addConnectionPooling(url: string): string {
    try {
        const urlObj = new URL(url);
        
        // Set connection limit (recommended: 10-20 for most applications)
        // This limits how many connections Prisma Client can open
        if (!urlObj.searchParams.has("connection_limit")) {
            urlObj.searchParams.set("connection_limit", "10");
        }
        
        // Set pool timeout (how long to wait for a connection from the pool)
        if (!urlObj.searchParams.has("pool_timeout")) {
            urlObj.searchParams.set("pool_timeout", "10");
        }
        
        // Set connect timeout (how long to wait when establishing a connection)
        if (!urlObj.searchParams.has("connect_timeout")) {
            urlObj.searchParams.set("connect_timeout", "10");
        }
        
        return urlObj.toString();
    } catch (error) {
        // If URL parsing fails, try to append parameters manually
        const separator = url.includes("?") ? "&" : "?";
        const hasConnectionLimit = url.includes("connection_limit");
        const hasPoolTimeout = url.includes("pool_timeout");
        const hasConnectTimeout = url.includes("connect_timeout");
        
        let params: string[] = [];
        if (!hasConnectionLimit) {
            params.push("connection_limit=10");
        }
        if (!hasPoolTimeout) {
            params.push("pool_timeout=10");
        }
        if (!hasConnectTimeout) {
            params.push("connect_timeout=10");
        }
        
        return params.length > 0 ? `${url}${separator}${params.join("&")}` : url;
    }
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (!isEdgeRuntime && process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}