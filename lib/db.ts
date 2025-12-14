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

    // Use Edge client only in Edge runtimes, otherwise use Node client
    if (isEdgeRuntime) {
        if (!accelerateUrl) {
            throw new Error("PRISMA_ACCELERATE_URL must be set in Edge runtimes.");
        }
        console.log("🚀 [Prisma] Using Accelerate with Edge Client");
        return new PrismaClientEdge({
            datasourceUrl: accelerateUrl,
        }).$extends(withAccelerate());
    }

    // For Node.js runtime, use PrismaClientNode with Accelerate if available
    if (accelerateUrl) {
        console.log("🚀 [Prisma] Using Accelerate with Node Client");
        console.log("📊 [Prisma] Accelerate URL:", accelerateUrl.substring(0, 50) + "...");
        const client = new PrismaClientNode({
            datasources: {
                db: { url: accelerateUrl },
            },
        }).$extends(withAccelerate());
        
        // Log when first query is made
        const originalQuery = (client as any).$queryRaw;
        if (originalQuery) {
            console.log("✅ [Prisma] Accelerate client initialized and ready");
        }
        
        return client;
    }
    
    console.log("⚠️ [Prisma] Accelerate not enabled - using direct connection");

    // Fallback to direct connection with connection pooling
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

// Clear cached Prisma Client if Accelerate URL changed
const currentAccelerateUrl = process.env.PRISMA_ACCELERATE_URL;
const cachedAccelerateUrl = (globalForPrisma as any).__accelerateUrl;

if (cachedAccelerateUrl !== currentAccelerateUrl) {
    console.log("🔄 [Prisma] Accelerate URL changed, clearing cached client");
    globalForPrisma.prisma = undefined;
    (globalForPrisma as any).__accelerateUrl = currentAccelerateUrl;
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (!isEdgeRuntime && process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
    (globalForPrisma as any).__accelerateUrl = currentAccelerateUrl;
}