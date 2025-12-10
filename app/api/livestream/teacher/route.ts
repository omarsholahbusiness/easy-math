import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get teacher's courses
    const teacherCourses = await db.course.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    const courseIds = teacherCourses.map((c) => c.id);

    // Get livestreams linked to teacher's courses
    const livestreams = await db.liveSession.findMany({
      where: {
        courses: {
          some: {
            courseId: {
              in: courseIds,
            },
          },
        },
      },
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                userId: true,
                user: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
          },
        },
        chapter: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });

    return NextResponse.json(livestreams);
  } catch (error) {
    console.error("[LIVESTREAM_TEACHER_GET]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[LIVESTREAM_TEACHER_GET] Error details:", errorMessage);
    return new NextResponse(
      JSON.stringify({ error: "Internal Error", message: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

