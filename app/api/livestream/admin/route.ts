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

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get all livestreams
    const livestreams = await db.liveSession.findMany({
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
    console.error("[LIVESTREAM_ADMIN_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

