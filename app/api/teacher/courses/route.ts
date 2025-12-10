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

    // Get courses owned by teacher (or all courses for admin)
    const whereClause = session.user.role === "ADMIN" 
      ? {} 
      : { userId: session.user.id };

    const courses = await db.course.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        isPublished: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("[TEACHER_COURSES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

