import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Teachers and admins have access without purchase
        const isStaff = user?.role === "TEACHER" || user?.role === "ADMIN";

        // Get the current quiz first to check if it's free
        const quiz = await db.quiz.findFirst({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId,
                isPublished: true
            }
        });

        if (!quiz) {
            return new NextResponse("Quiz not found", { status: 404 });
        }

        // Check if user has access to the course (unless they're staff or quiz is free)
        if (!isStaff && !quiz.isFree) {
            const purchase = await db.purchase.findUnique({
                where: {
                    userId_courseId: {
                        userId,
                        courseId: resolvedParams.courseId
                    }
                }
            });

            if (!purchase) {
                return new NextResponse("Course access required", { status: 403 });
            }
        }

        // Get all content (chapters and quizzes) for this course
        const [chapters, quizzes] = await db.$transaction([
            db.chapter.findMany({
                where: {
                    courseId: resolvedParams.courseId,
                    isPublished: true
                },
                select: {
                    id: true,
                    position: true
                },
                orderBy: {
                    position: "asc"
                }
            }),
            db.quiz.findMany({
                where: {
                    courseId: resolvedParams.courseId,
                    isPublished: true
                },
                select: {
                    id: true,
                    position: true
                },
                orderBy: {
                    position: "asc"
                }
            })
        ]);

        // Add type to each item and combine
        const chaptersWithType = chapters.map(chapter => ({ ...chapter, type: 'chapter' as const }));
        const quizzesWithType = quizzes.map(quiz => ({ ...quiz, type: 'quiz' as const }));

        // Combine and sort by position
        const sortedContent = [...chaptersWithType, ...quizzesWithType].sort((a, b) => a.position - b.position);

        // Find current quiz index
        const currentIndex = sortedContent.findIndex(content => 
            content.id === resolvedParams.quizId && content.type === 'quiz'
        );

        // Find next and previous content
        const nextContent = currentIndex !== -1 && currentIndex < sortedContent.length - 1 
            ? sortedContent[currentIndex + 1] 
            : null;
        
        const previousContent = currentIndex > 0 
            ? sortedContent[currentIndex - 1] 
            : null;

        const response = {
            nextContentId: nextContent?.id || null,
            previousContentId: previousContent?.id || null,
            nextContentType: nextContent?.type || null,
            previousContentType: previousContent?.type || null,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("[QUIZ_NAVIGATION_GET] Error details:", error);
        if (error instanceof Error) {
            console.error("[QUIZ_NAVIGATION_GET] Error message:", error.message);
            console.error("[QUIZ_NAVIGATION_GET] Error stack:", error.stack);
            return new NextResponse(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
} 