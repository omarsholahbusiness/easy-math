import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { sessionId } = await params;

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const livestream = await db.liveSession.findUnique({
      where: { id: sessionId },
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
    });

    if (!livestream) {
      return new NextResponse("Livestream not found", { status: 404 });
    }

    // Check access
    if (session.user.role === "TEACHER") {
      const hasAccess = livestream.courses.some(
        (lc) => lc.course.userId === session.user.id
      );
      if (!hasAccess) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    } else if (session.user.role === "USER") {
      // Students can only see published sessions
      if (!livestream.isPublished) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    return NextResponse.json(livestream);
  } catch (error) {
    console.error("[LIVESTREAM_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

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
      const hasAccess = livestream.courses.some((lc) => {
        // Need to check if teacher owns the course
        return db.course.findUnique({
          where: {
            id: lc.courseId,
            userId: session.user.id,
          },
        });
      });

      if (!hasAccess) {
        return new NextResponse("Forbidden", { status: 403 });
      }
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

    // Validate link type if provided
    if (linkType && linkType !== "ZOOM" && linkType !== "GOOGLE_MEET") {
      return new NextResponse("Invalid link type", { status: 400 });
    }

    // Update course links if provided
    if (courseIds && Array.isArray(courseIds)) {
      // Verify course ownership for teachers
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

      // Delete existing course links
      await db.liveSessionCourse.deleteMany({
        where: {
          liveSessionId: sessionId,
        },
      });

      // Create new course links
      await db.liveSessionCourse.createMany({
        data: courseIds.map((courseId: string) => ({
          liveSessionId: sessionId,
          courseId,
        })),
      });
    }

    // Update livestream
    const updated = await db.liveSession.update({
      where: { id: sessionId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(linkUrl && { linkUrl }),
        ...(linkType && { linkType }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isFree !== undefined && { isFree }),
        ...(chapterId !== undefined && { chapterId: chapterId || null }),
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[LIVESTREAM_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
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

    await db.liveSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[LIVESTREAM_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

