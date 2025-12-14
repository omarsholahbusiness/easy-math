import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Cache for 60 seconds (1 minute)
export const revalidate = 60;

export async function GET() {
  try {
    // Try to get user for filtering
    let userId = null;
    let student = null;
    
    try {
      const authResult = await auth();
      userId = authResult.userId;
      
      if (userId) {
        student = await db.user.findUnique({
          where: { id: userId },
          select: { grade: true, division: true, role: true }
        });
      }
    } catch (error) {
      // User not authenticated, continue without filtering
    }

    // Build where clause - same filtering logic as main courses API
    const whereClause: any = {
      isPublished: true,
    };

    // Filter by student's grade and division if they're a regular user
    if (student && student.role === "USER" && student.grade) {
      const intermediateGrades = ["الاول الاعدادي", "الثاني الاعدادي", "الثالث الاعدادي"];
      const isIntermediateGrade = intermediateGrades.includes(student.grade);
      
      whereClause.OR = [
        // Courses for all grades (الكل)
        { grade: "الكل" },
        // For intermediate grades: match by grade only (no division needed)
        ...(isIntermediateGrade ? [
          { grade: student.grade }
        ] : []),
        // For high school grades: match by grade and division (if division exists)
        ...(!isIntermediateGrade && student.division ? [
          {
            AND: [
              { grade: student.grade },
              {
                divisions: {
                  has: student.division
                }
              }
            ]
          }
        ] : []),
        // Old courses: no grade set yet (backward compatibility)
        {
          grade: null
        }
      ];
    }

    const courses = await db.course.findMany({
      where: whereClause,
      include: {
        chapters: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          },
        },
        quizzes: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          },
        },
        purchases: {
          where: {
            status: "ACTIVE",
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Return courses with default progress of 0 for public view
    const coursesWithDefaultProgress = courses.map(({ purchases, ...course }) => ({
      ...course,
      progress: 0,
      enrollmentCount: purchases.length,
    }));

    // Add cache headers to reduce queries
    return NextResponse.json(coursesWithDefaultProgress, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error("[COURSES_PUBLIC] Error details:", error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error("[COURSES_PUBLIC] Error message:", error.message);
      console.error("[COURSES_PUBLIC] Error stack:", error.stack);
      
      // Check if it's a database connection error (could be Accelerate issue)
      if (error.message.includes("P1001") || error.message.includes("Can't reach database")) {
        console.error("[COURSES_PUBLIC] Database connection error - check Accelerate URL or database connection");
        return NextResponse.json(
          { 
            error: "Database connection failed", 
            message: "Unable to connect to database. Please check your database connection or Accelerate configuration.",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
          },
          { status: 503 }
        );
      }
      
      // Check if it's an Accelerate-specific error
      if (error.message.includes("accelerate") || error.message.includes("Accelerate")) {
        console.error("[COURSES_PUBLIC] Accelerate-related error detected");
        return NextResponse.json(
          { 
            error: "Accelerate connection error", 
            message: "Error connecting through Prisma Accelerate. Please check your PRISMA_ACCELERATE_URL configuration.",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
          },
          { status: 503 }
        );
      }
    }
    
    // If the table doesn't exist or there's a database connection issue,
    // return an empty array instead of an error
    if (error instanceof Error && (
      error.message.includes("does not exist") || 
      error.message.includes("P2021") ||
      error.message.includes("table")
    )) {
      return NextResponse.json([]);
    }
    
    return NextResponse.json(
      { 
        error: "Internal Server Error",
        message: "An error occurred while fetching courses",
        details: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
} 