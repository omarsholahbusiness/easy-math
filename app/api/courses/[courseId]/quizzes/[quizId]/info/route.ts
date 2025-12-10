import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get basic quiz info first to check if it's free
        const quiz = await db.quiz.findFirst({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            select: {
                id: true,
                title: true,
                maxAttempts: true,
                timer: true,
                isFree: true
            }
        });

        if (!quiz) {
            return new NextResponse("Quiz not found", { status: 404 });
        }

        // Check if user has access to the course
        // If quiz is free (isFree === true), all students have access regardless of purchase
        if (!quiz.isFree) {
            // Get course to check if it's free
            const course = await db.course.findUnique({
                where: {
                    id: resolvedParams.courseId
                },
                select: {
                    price: true
                }
            });

            if (!course) {
                return new NextResponse("Course not found", { status: 404 });
            }

            // Free courses (price === 0 or null) are always accessible
            let hasAccess = false;
            if (course.price === null || course.price === 0) {
                hasAccess = true; // Free course
            } else {
                const purchase = await db.purchase.findUnique({
                    where: {
                        userId_courseId: {
                            userId,
                            courseId: resolvedParams.courseId
                        },
                        status: "ACTIVE"
                    }
                });
                hasAccess = !!purchase;
            }

            if (!hasAccess) {
                return new NextResponse("Course access required", { status: 403 });
            }
        }

        // Get attempt information
        const existingResults = await db.quizResult.findMany({
            where: {
                studentId: userId,
                quizId: resolvedParams.quizId
            },
            orderBy: {
                attemptNumber: 'desc'
            }
        });

        const currentAttemptNumber = existingResults.length + 1;

        // Return quiz info with attempt data
        const quizInfo = {
            ...quiz,
            currentAttempt: currentAttemptNumber,
            previousAttempts: existingResults.length
        };

        return NextResponse.json(quizInfo);
    } catch (error) {
        console.log("[QUIZ_INFO_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 