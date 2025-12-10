import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET current user profile
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await db.user.findUnique({
            where: {
                id: session.user.id,
            },
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                parentPhoneNumber: true,
                image: true,
                grade: true,
                division: true,
                studyType: true,
                governorate: true,
                role: true,
            },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("[PROFILE_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// PATCH update current user profile (grade and division only)
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { grade, division } = await req.json();

        // Validate that only grade and division are being updated
        // Users can only update their own grade and division
        const updateData: { grade?: string | null; division?: string | null } = {};

        if (grade !== undefined) {
            // Validate grade value
            const validGrades = [
                "الاول الاعدادي",
                "الثاني الاعدادي",
                "الثالث الاعدادي",
                "الأول الثانوي",
                "الثاني الثانوي",
                "الثالث الثانوي",
            ];

            if (grade && !validGrades.includes(grade)) {
                return new NextResponse("Invalid grade value", { status: 400 });
            }

            updateData.grade = grade || null;
        }

        if (division !== undefined) {
            // Validate division value based on grade
            const user = await db.user.findUnique({
                where: { id: session.user.id },
                select: { grade: true },
            });

            const currentGrade = grade || user?.grade;

            if (currentGrade) {
                const validDivisions: Record<string, string[]> = {
                    "الأول الثانوي": ["بكالوريا", "عام"],
                    "الثاني الثانوي": ["علمي", "أدبي"],
                    "الثالث الثانوي": ["علمي رياضة", "أدبي"],
                };

                const intermediateGrades = ["الاول الاعدادي", "الثاني الاعدادي", "الثالث الاعدادي"];

                if (intermediateGrades.includes(currentGrade)) {
                    // Intermediate grades don't have divisions
                    if (division) {
                        return new NextResponse("Division not allowed for intermediate grades", { status: 400 });
                    }
                    updateData.division = null;
                } else if (validDivisions[currentGrade]) {
                    if (division && !validDivisions[currentGrade].includes(division)) {
                        return new NextResponse("Invalid division for selected grade", { status: 400 });
                    }
                    updateData.division = division || null;
                }
            } else {
                updateData.division = division || null;
            }
        }

        // If grade is being changed, reset division if needed
        if (grade !== undefined && updateData.grade) {
            const intermediateGrades = ["الاول الاعدادي", "الثاني الاعدادي", "الثالث الاعدادي"];
            if (intermediateGrades.includes(updateData.grade)) {
                updateData.division = null;
            }
        }

        // Update user
        const updatedUser = await db.user.update({
            where: {
                id: session.user.id,
            },
            data: updateData,
            select: {
                id: true,
                fullName: true,
                grade: true,
                division: true,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("[PROFILE_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

