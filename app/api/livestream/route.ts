import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const {
      title,
      description,
      linkUrl,
      linkType,
      startDate,
      endDate,
      isFree,
      courseIds,
      chapterId,
    } = await req.json();

    // Validation
    if (!title || !linkUrl || !linkType || !startDate || !courseIds || courseIds.length === 0) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    if (linkType !== "ZOOM" && linkType !== "GOOGLE_MEET") {
      return new NextResponse("Invalid link type", { status: 400 });
    }

    // Verify course ownership (for teachers)
    if (session.user.role === "TEACHER") {
      const teacherCourses = await db.course.findMany({
        where: {
          userId: session.user.id,
          id: {
            in: courseIds,
          },
        },
        select: {
          id: true,
        },
      });

      if (teacherCourses.length !== courseIds.length) {
        return new NextResponse("You don't have access to all selected courses", { status: 403 });
      }
    }

    // Verify chapter belongs to one of the courses (if provided)
    if (chapterId) {
      const chapter = await db.chapter.findUnique({
        where: { id: chapterId },
        select: { courseId: true },
      });

      if (!chapter) {
        return new NextResponse("Chapter not found", { status: 404 });
      }

      if (!courseIds.includes(chapter.courseId)) {
        return new NextResponse("Chapter must belong to one of the selected courses", { status: 400 });
      }
    }

    // Create livestream session
    const livestream = await db.liveSession.create({
      data: {
        title,
        description,
        linkUrl,
        linkType,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isFree: isFree || false,
        chapterId: chapterId || null,
        courses: {
          create: courseIds.map((courseId: string) => ({
            courseId,
          })),
        },
      },
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
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
    });

    return NextResponse.json(livestream);
  } catch (error) {
    console.error("[LIVESTREAM_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

