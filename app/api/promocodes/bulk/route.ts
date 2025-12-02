import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Generate a unique 6-character code (A-Z, 0-9)
function generateCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// POST create bulk promocodes (1-99 codes)
export async function POST(req: NextRequest) {
    try {
        const { userId, user } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Only teachers and admins can create promocodes
        if (user?.role !== "TEACHER" && user?.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const body = await req.json();
        const { courseId, quantity } = body;

        // Validate required fields
        if (!courseId) {
            return new NextResponse(
                JSON.stringify({ error: "الكورس مطلوب" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (!quantity || quantity < 1 || quantity > 99) {
            return new NextResponse(
                JSON.stringify({ error: "الكمية يجب أن تكون بين 1 و 99" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Verify course exists
        const course = await db.course.findUnique({
            where: { id: courseId },
        });

        if (!course) {
            return new NextResponse(
                JSON.stringify({ error: "الكورس غير موجود" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Generate unique codes
        const codes: string[] = [];
        const createdPromocodes = [];

        for (let i = 0; i < quantity; i++) {
            let code: string;
            let attempts = 0;
            let isUnique = false;

            // Try to generate a unique code (max 100 attempts)
            while (!isUnique && attempts < 100) {
                code = generateCode();
                const existing = await db.promoCode.findUnique({
                    where: { code },
                });
                if (!existing) {
                    isUnique = true;
                    codes.push(code);
                }
                attempts++;
            }

            if (!isUnique) {
                return new NextResponse(
                    JSON.stringify({ error: "فشل في إنشاء أكواد فريدة. يرجى المحاولة مرة أخرى" }),
                    { status: 500, headers: { "Content-Type": "application/json" } }
                );
            }
        }

        // Create all promocodes in a transaction
        let result;
        try {
            result = await db.$transaction(
                codes.map((code) =>
                    db.promoCode.create({
                        data: {
                            code,
                            discountType: "PERCENTAGE",
                            discountValue: 100, // Always 100% discount
                            usageLimit: 1, // Single use
                            isActive: true,
                            courseId,
                        },
                        include: {
                            course: {
                                select: {
                                    id: true,
                                    title: true,
                                },
                            },
                        },
                    })
                )
            );
        } catch (error) {
            // If relation doesn't exist (migration not run), create without include
            if (error instanceof Error && (
                error.message.includes("Unknown arg") ||
                error.message.includes("relation") ||
                error.message.includes("courseId")
            )) {
                console.warn("[PROMOCODES_BULK] Course relation not available, creating without include. Please run migration.");
                result = await db.$transaction(
                    codes.map((code) =>
                        db.promoCode.create({
                            data: {
                                code,
                                discountType: "PERCENTAGE",
                                discountValue: 100,
                                usageLimit: 1,
                                isActive: true,
                            },
                        })
                    )
                );
                // Add null course to each promocode for consistency
                result = result.map((p: any) => ({ ...p, course: null }));
            } else {
                throw error;
            }
        }

        return NextResponse.json({
            success: true,
            count: result.length,
            promocodes: result,
        });
    } catch (error) {
        console.error("[PROMOCODES_BULK_POST]", error);
        if (error instanceof Error) {
            return new NextResponse(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}

