import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { sessionId } = await params;

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const livestream = await db.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        courses: {
          select: {
            courseId: true,
          },
        },
      },
    });

    if (!livestream) {
      return new NextResponse("Livestream not found", { status: 404 });
    }

    // Check access for teachers
    if (session.user.role === "TEACHER") {
      const courseIds = livestream.courses.map((lc) => lc.courseId);
      const teacherCourses = await db.course.findMany({
        where: {
          id: {
            in: courseIds,
          },
          userId: session.user.id,
        },
        select: {
          id: true,
        },
      });

      if (teacherCourses.length === 0) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    // Toggle publish status
    const updated = await db.liveSession.update({
      where: { id: sessionId },
      data: {
        isPublished: !livestream.isPublished,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[LIVESTREAM_PUBLISH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

