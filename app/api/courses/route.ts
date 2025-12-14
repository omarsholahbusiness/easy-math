import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Cache for 60 seconds (1 minute)
export const revalidate = 60;

export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        const { title } = await req.json();

        if(!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.create({
            data: {
                userId,
                title,
            }
        });

        return NextResponse.json(course);

    } catch (error) {
        console.log("[Courses]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeProgress = searchParams.get('includeProgress') === 'true';
    
    // Try to get user, but don't fail if not authenticated
    let userId = null;
    let student = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
      
      // Get student's grade and division for filtering
      if (userId) {
        student = await db.user.findUnique({
          where: { id: userId },
          select: { grade: true, division: true, role: true }
        });
      }
    } catch (error) {
      // User is not authenticated, which is fine for the home page
      console.log("User not authenticated, showing courses without progress");
    }

    // Build where clause for course filtering
    // If user is a student, filter by grade/division
    // If course has no grade/division (old courses), show to everyone (backward compatibility)
    // If user is teacher/admin or not authenticated, show all published courses
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
        user: true,
        chapters: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          }
        },
        quizzes: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          }
        },
        purchases: includeProgress && userId ? {
          where: {
            userId: userId,
            status: "ACTIVE"
          }
        } : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (includeProgress && userId) {
      // OPTIMIZED: Batch all progress queries instead of N+1 queries
      const allChapterIds = courses.flatMap(course => course.chapters.map(ch => ch.id));
      const allQuizIds = courses.flatMap(course => course.quizzes.map(q => q.id));

      // Single query for all completed chapters
      const allCompletedChapters = await db.userProgress.findMany({
        where: {
          userId,
          chapterId: { in: allChapterIds },
          isCompleted: true
        },
        select: {
          chapterId: true
        }
      });

      // Single query for all completed quizzes
      const allCompletedQuizzes = await db.quizResult.findMany({
        where: {
          studentId: userId,
          quizId: { in: allQuizIds }
        },
        select: {
          quizId: true
        }
      });

      // Create sets for fast lookup
      const completedChapterIds = new Set(allCompletedChapters.map(c => c.chapterId));
      const completedQuizIds = new Set(allCompletedQuizzes.map(q => q.quizId));

      // Calculate progress for each course using in-memory data
      const coursesWithProgress = courses.map((course) => {
        const totalChapters = course.chapters.length;
        const totalQuizzes = course.quizzes.length;
        const totalContent = totalChapters + totalQuizzes;

        const completedChapters = course.chapters.filter(ch => completedChapterIds.has(ch.id)).length;
        const completedQuizzes = course.quizzes.filter(q => completedQuizIds.has(q.id)).length;

        const completedContent = completedChapters + completedQuizzes;
        const progress = totalContent > 0 ? (completedContent / totalContent) * 100 : 0;

        return {
          ...course,
          progress
        };
      });

      // Add cache headers to reduce queries
      return NextResponse.json(coursesWithProgress, {
        headers: {
          'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60',
        },
      });
    }

    // For unauthenticated users, return courses without progress
    const coursesWithoutProgress = courses.map(course => ({
      ...course,
      progress: 0
    }));

    // Add cache headers to reduce queries
    return NextResponse.json(coursesWithoutProgress, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.log("[COURSES]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}