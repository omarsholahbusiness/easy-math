import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    console.log("🔍 [TEST_DB] Testing database connection...");
    
    // Test simple query
    const userCount = await db.user.count();
    console.log("✅ [TEST_DB] Database connection successful, user count:", userCount);
    
    // Test courses query
    const courseCount = await db.course.count({
      where: { isPublished: true }
    });
    console.log("✅ [TEST_DB] Courses query successful, published courses:", courseCount);
    
    return NextResponse.json({
      success: true,
      message: "Database connection is working",
      data: {
        userCount,
        publishedCourseCount: courseCount,
        accelerateEnabled: !!process.env.PRISMA_ACCELERATE_URL,
        accelerateUrl: process.env.PRISMA_ACCELERATE_URL ? 
          process.env.PRISMA_ACCELERATE_URL.substring(0, 50) + "..." : null
      }
    });
  } catch (error) {
    console.error("❌ [TEST_DB] Database connection failed:", error);
    
    if (error instanceof Error) {
      console.error("[TEST_DB] Error message:", error.message);
      console.error("[TEST_DB] Error stack:", error.stack);
      
      // Check for Accelerate-specific errors
      const isAccelerateError = error.message.includes("accelerate") || 
                                error.message.includes("Accelerate") ||
                                error.message.includes("P1001") ||
                                error.message.includes("Can't reach database");
      
      return NextResponse.json({
        success: false,
        error: "Database connection failed",
        message: error.message,
        isAccelerateError,
        accelerateEnabled: !!process.env.PRISMA_ACCELERATE_URL,
        suggestion: isAccelerateError && process.env.PRISMA_ACCELERATE_URL
          ? "This might be an Accelerate connection issue. Try: 1) Check PRISMA_ACCELERATE_URL is correct, 2) Restart dev server, 3) Temporarily disable Accelerate to test direct connection"
          : "Check your database connection and environment variables"
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: false,
      error: "Unknown error occurred"
    }, { status: 500 });
  }
}

