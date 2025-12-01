import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

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

    return NextResponse.json(coursesWithDefaultProgress);
  } catch (error) {
    console.log("[COURSES_PUBLIC]", error);
    
    // If the table doesn't exist or there's a database connection issue,
    // return an empty array instead of an error
    if (error instanceof Error && (
      error.message.includes("does not exist") || 
      error.message.includes("P2021") ||
      error.message.includes("table")
    )) {
      return NextResponse.json([]);
    }
    
    return new NextResponse("Internal Error", { status: 500 });
  }
} 