import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        console.log("🔍 [TEST_ACCELERATE] Making test query...");
        
        // Make multiple queries to ensure they go through Accelerate
        const startTime = Date.now();
        const userCount = await db.user.count();
        const courseCount = await db.course.count();
        const endTime = Date.now();
        
        // Get Accelerate status from environment
        const accelerateUrl = process.env.PRISMA_ACCELERATE_URL;
        const isAccelerateEnabled = !!accelerateUrl;
        
        // Check if client is using Accelerate
        const clientUrl = (db as any).$client?.$engine?.datasourceUrl || 
                         (db as any).$client?.datasources?.db?.url || 
                         "unknown";
        
        console.log("✅ [TEST_ACCELERATE] Queries completed in", endTime - startTime, "ms");
        console.log("📊 [TEST_ACCELERATE] Client URL:", clientUrl.substring(0, 50) + "...");
        
        return NextResponse.json({
            success: true,
            queries: {
                userCount,
                courseCount,
                queryTime: `${endTime - startTime}ms`
            },
            accelerate: {
                enabled: isAccelerateEnabled,
                url: accelerateUrl ? accelerateUrl.substring(0, 50) + "..." : null,
                clientUrl: clientUrl.substring(0, 50) + "...",
                usingAccelerate: clientUrl.startsWith("prisma://")
            },
            message: isAccelerateEnabled 
                ? "✅ Accelerate is enabled - check Prisma Cloud dashboard for these queries"
                : "⚠️ Accelerate is not enabled",
            instructions: [
                "1. Check Prisma Cloud dashboard (wait 10-30 seconds)",
                "2. Look for queries in the Accelerate section",
                "3. Refresh this endpoint multiple times to generate more queries",
                "4. Check your terminal for query logs"
            ]
        });
    } catch (error) {
        console.error("[TEST_ACCELERATE] Error:", error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}

