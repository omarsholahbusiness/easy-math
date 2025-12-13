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

        // Parse pagination parameters from query string
        const { searchParams } = new URL(req.url);
        const fetchAll = searchParams.get("all") === "true";
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "100", 10);
        const skip = (page - 1) * limit;

        // If fetchAll is true, fetch all users without pagination
        // Otherwise, limit the maximum page size to prevent large responses
        const take = fetchAll ? undefined : Math.min(limit, 100);

        const [users, total] = await Promise.all([
            db.user.findMany({
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
            db.user.count()
        ]);

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
        console.error("[ADMIN_USERS_GET]", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error("[ADMIN_USERS_GET] Error details:", {
            message: errorMessage,
            stack: errorStack,
            error: error
        });
        return NextResponse.json(
            { 
                error: "Internal Server Error", 
                message: errorMessage,
                ...(process.env.NODE_ENV === "development" && { stack: errorStack })
            },
            { status: 500 }
        );
    }
} 