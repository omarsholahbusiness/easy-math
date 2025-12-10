import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const resolvedParams = await params;
    const { courseId, chapterId } = resolvedParams;

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Verify chapter belongs to course
    const chapter = await db.chapter.findUnique({
      where: { id: chapterId },
      select: {
        id: true,
        courseId: true,
      },
    });

    if (!chapter || chapter.courseId !== courseId) {
      return new NextResponse("Chapter not found in this course", { status: 404 });
    }

    // Get course
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        price: true,
      },
    });

    if (!course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    // Check if user has access (free course or purchased)
    let hasAccess = false;
    if (course.price === null || course.price === 0) {
      hasAccess = true; // Free course
    } else {
      const purchase = await db.purchase.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: courseId,
          },
          status: "ACTIVE",
        },
      });
      hasAccess = !!purchase;
    }

    // Get current time
    const now = new Date();

    // Get livestreams for this chapter
    const livestreams = await db.liveSession.findMany({
      where: {
        chapterId: chapterId,
        courses: {
          some: {
            courseId: courseId,
          },
        },
        isPublished: true,
        // Only show non-expired sessions
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
        // Filter by access: free sessions OR user has access
        ...(hasAccess
          ? [] // If user has access, show all (free and paid)
          : [{ isFree: true }]), // If no access, only show free sessions
      },
      include: {
        chapter: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        startDate: "asc",
      },
    });

    // Add status to each livestream
    const livestreamsWithStatus = livestreams.map((livestream) => {
      let status: "not_started" | "active" | "ended" = "not_started";

      if (livestream.endDate) {
        if (now < livestream.startDate) {
          status = "not_started";
        } else if (now >= livestream.startDate && now <= livestream.endDate) {
          status = "active";
        } else {
          status = "ended";
        }
      } else {
        if (now < livestream.startDate) {
          status = "not_started";
        } else {
          status = "active";
        }
      }

      return {
        ...livestream,
        status,
      };
    });

    return NextResponse.json(livestreamsWithStatus);
  } catch (error) {
    console.error("[CHAPTER_LIVESTREAMS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

