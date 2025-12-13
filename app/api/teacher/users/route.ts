import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        console.log("[TEACHER_USERS_GET] Session:", { userId: session?.user?.id, role: session?.user?.role });

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "TEACHER") {
            console.log("[TEACHER_USERS_GET] Access denied:", { userId: session.user.id, role: session.user.role });
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Parse pagination parameters from query string
        const { searchParams } = new URL(req.url);
        const fetchAll = searchParams.get("all") === "true";
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "100", 10);
        const skip = (page - 1) * limit;

        // If fetchAll is true, fetch all users without pagination
        // Otherwise, limit the maximum page size to prevent large responses
        const take = fetchAll ? undefined : Math.min(limit, 100);

        // Teachers can see all users (USER, TEACHER, and ADMIN roles)
        const [users, total] = await Promise.all([
            db.user.findMany({
            where: {
                role: {
                    in: ["USER", "TEACHER", "ADMIN"]
                }
            },
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                parentPhoneNumber: true,
                role: true,
                balance: true,
                grade: true,
                division: true,
                studyType: true,
                governorate: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        courses: true,
                        purchases: true,
                        userProgress: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
                },
                ...(take !== undefined ? { skip, take } : {})
            }),
            db.user.count({
                where: {
                    role: {
                        in: ["USER", "TEACHER", "ADMIN"]
                    }
                }
            })
        ]);

        console.log("[TEACHER_USERS_GET] Found users:", users.length, "of", total);
        return NextResponse.json({
            users,
            pagination: {
                page,
                limit: take || total,
                total,
                totalPages: take ? Math.ceil(total / take) : 1
            }
        });
    } catch (error) {
        console.error("[TEACHER_USERS_GET]", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { 
                error: "Internal Server Error", 
                message: errorMessage
            },
            { status: 500 }
        );
    }
}
