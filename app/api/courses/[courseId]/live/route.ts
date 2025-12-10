import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { courseId } = await params;

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
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

    // Get livestreams for this course
    const livestreams = await db.liveSession.findMany({
      where: {
        courses: {
          some: {
            courseId: courseId,
          },
        },
        isPublished: true,
        // Only show non-expired sessions (or sessions without end date)
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
        // Filter by access: free sessions OR user has access
        ...(hasAccess
          ? {} // If user has access, show all (free and paid)
          : { isFree: true }), // If no access, only show free sessions
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
        // No end date
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
    console.error("[COURSE_LIVE_GET]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[COURSE_LIVE_GET] Error details:", errorMessage);
    return new NextResponse(
      JSON.stringify({ error: "Internal Error", message: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

