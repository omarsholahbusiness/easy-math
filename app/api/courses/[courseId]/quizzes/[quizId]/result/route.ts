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

        // Get the quiz first to check if it's free
        const quiz = await db.quiz.findUnique({
            where: {
                id: resolvedParams.quizId
            },
            select: {
                maxAttempts: true,
                isFree: true
            }
        });

        if (!quiz) {
            return new NextResponse(JSON.stringify({ error: "Quiz not found" }), { 
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Get the latest quiz result first - if user completed the quiz, they should see the result
        // This check happens first to avoid race conditions after quiz submission
        // Try multiple times with small delays to handle race conditions
        let existingQuizResult = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            existingQuizResult = await db.quizResult.findFirst({
                where: {
                    studentId: userId,
                    quizId: resolvedParams.quizId
                },
                orderBy: {
                    attemptNumber: 'desc'
                },
                select: {
                    id: true // Just check if it exists
                }
            });

            if (existingQuizResult) {
                break; // Found it, exit loop
            }

            // Wait a bit before retrying (only if not found)
            if (attempt < 2) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        console.log("[QUIZ_RESULT_GET] Checking access:", {
            userId,
            courseId: resolvedParams.courseId,
            quizId: resolvedParams.quizId,
            hasQuizResult: !!existingQuizResult,
            isQuizFree: quiz.isFree
        });

        // If user has completed the quiz, allow them to see the result even without purchase
        // (they already completed it, so they had access at that time)
        // OR if quiz is free, allow access
        if (!existingQuizResult && !quiz.isFree) {
            // Only check purchase if user hasn't completed the quiz yet and quiz is not free
            const purchase = await db.purchase.findUnique({
                where: {
                    userId_courseId: {
                        userId,
                        courseId: resolvedParams.courseId
                    },
                    status: "ACTIVE"
                }
            });

            console.log("[QUIZ_RESULT_GET] Purchase check:", {
                userId,
                courseId: resolvedParams.courseId,
                hasPurchase: !!purchase
            });

            if (!purchase) {
                // Get course to check if it's free
                const course = await db.course.findUnique({
                    where: {
                        id: resolvedParams.courseId
                    },
                    select: {
                        price: true
                    }
                });

                // If course is not free, require purchase
                if (!course || (course.price !== null && course.price !== 0)) {
                    return new NextResponse(JSON.stringify({ error: "Course access required" }), { 
                        status: 403,
                        headers: { "Content-Type": "application/json" }
                    });
                }
            }
        }

        // Get all quiz results to determine total attempts
        const allResults = await db.quizResult.findMany({
            where: {
                studentId: userId,
                quizId: resolvedParams.quizId
            },
            orderBy: {
                attemptNumber: 'desc'
            }
        });

        // Get the latest quiz result for this user (most recent attempt)
        const quizResult = await db.quizResult.findFirst({
            where: {
                studentId: userId,
                quizId: resolvedParams.quizId
            },
            orderBy: {
                attemptNumber: 'desc'
            },
            include: {
                answers: {
                    include: {
                        question: {
                            select: {
                                text: true,
                                type: true,
                                points: true,
                                position: true
                            }
                        }
                    },
                    orderBy: {
                        question: {
                            position: 'asc'
                        }
                    }
                }
            }
        });

        if (!quizResult) {
            return new NextResponse(JSON.stringify({ error: "Quiz result not found. Please complete the quiz first." }), { 
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Add maxAttempts and attempt info to the result
        const resultWithAttemptInfo = {
            ...quizResult,
            maxAttempts: quiz?.maxAttempts || 1,
            totalAttempts: allResults.length
        };

        return NextResponse.json(resultWithAttemptInfo);
    } catch (error) {
        console.error("[QUIZ_RESULT_GET]", error);
        const errorMessage = error instanceof Error ? error.message : "Internal server error";
        return new NextResponse(JSON.stringify({ error: errorMessage }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
} 