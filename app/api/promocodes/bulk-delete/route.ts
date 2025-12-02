import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE bulk promocodes by course
export async function DELETE(req: NextRequest) {
    try {
        const { userId, user } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Only teachers and admins can delete promocodes
        if (user?.role !== "TEACHER" && user?.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const body = await req.json();
        const { courseId } = body;

        // Build where clause
        const whereClause: any = {};
        if (courseId && courseId !== "all") {
            whereClause.courseId = courseId;
        }

        // Delete promocodes
        const result = await db.promoCode.deleteMany({
            where: whereClause,
        });

        return NextResponse.json({
            success: true,
            count: result.count,
            message: `تم حذف ${result.count} كود بنجاح`,
        });
    } catch (error) {
        console.error("[PROMOCODES_BULK_DELETE]", error);
        if (error instanceof Error) {
            return new NextResponse(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}

