import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { 
      fullName, 
      phoneNumber, 
      parentPhoneNumber, 
      grade,
      division,
      studyType,
      governorate,
      password, 
      confirmPassword,
      recaptchaToken
    } = await req.json();

    if (!fullName || !phoneNumber || !parentPhoneNumber || !password || !confirmPassword) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Verify reCAPTCHA if secret key is configured
    if (process.env.RECAPTCHA_SECRET_KEY) {
      if (!recaptchaToken) {
        console.error("[REGISTER] reCAPTCHA token missing");
        return new NextResponse("reCAPTCHA verification required", { status: 400 });
      }

      try {
        console.log("[REGISTER] Verifying reCAPTCHA token...");
        const verifyResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
        });

        const verifyData = await verifyResponse.json();
        console.log("[REGISTER] reCAPTCHA verification response:", {
          success: verifyData.success,
          "error-codes": verifyData["error-codes"],
          score: verifyData.score,
          hostname: verifyData.hostname,
        });

        if (!verifyData.success) {
          const errorCodes = verifyData["error-codes"] || [];
          console.error("[REGISTER] reCAPTCHA verification failed:", errorCodes);
          
          // Provide more specific error messages
          if (errorCodes.includes("invalid-input-response")) {
            return new NextResponse("reCAPTCHA token is invalid or expired", { status: 400 });
          } else if (errorCodes.includes("invalid-input-secret")) {
            return new NextResponse("reCAPTCHA secret key is invalid", { status: 500 });
          } else if (errorCodes.includes("timeout-or-duplicate")) {
            return new NextResponse("reCAPTCHA token expired. Please verify again", { status: 400 });
          } else if (errorCodes.includes("bad-request")) {
            return new NextResponse("Invalid reCAPTCHA request", { status: 400 });
          }
          
          return new NextResponse(`reCAPTCHA verification failed: ${errorCodes.join(", ")}`, { status: 400 });
        }

        // Check score only for v3 (v2 doesn't have score)
        if (verifyData.score !== undefined) {
          const score = verifyData.score;
          const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE || "0.5");

          if (score < minScore) {
            return new NextResponse("reCAPTCHA score too low", { status: 400 });
          }
        }
        // For v2, if success is true, we're good to go (no score check needed)
        console.log("[REGISTER] reCAPTCHA verification successful");
      } catch (error) {
        console.error("[REGISTER] reCAPTCHA verification error:", error);
        return new NextResponse("reCAPTCHA verification error", { status: 500 });
      }
    }

    if (password !== confirmPassword) {
      return new NextResponse("Passwords do not match", { status: 400 });
    }

    // Check if phone number is the same as parent phone number
    if (phoneNumber === parentPhoneNumber) {
      return new NextResponse("Phone number cannot be the same as parent phone number", { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { phoneNumber },
          { parentPhoneNumber }
        ]
      },
    });

    if (existingUser) {
      if (existingUser.phoneNumber === phoneNumber) {
        return new NextResponse("Phone number already exists", { status: 400 });
      }
      if (existingUser.parentPhoneNumber === parentPhoneNumber) {
        return new NextResponse("Parent phone number already exists", { status: 400 });
      }
    }

    // Hash password (no complexity requirements)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if grade is intermediate (doesn't require division)
    const intermediateGrades = ["الاول الاعدادي", "الثاني الاعدادي", "الثالث الاعدادي"];
    const isIntermediateGrade = grade && intermediateGrades.includes(grade);
    
    // Create user directly without email verification
    await db.user.create({
      data: {
        fullName,
        phoneNumber,
        parentPhoneNumber,
        grade,
        division: isIntermediateGrade ? null : division, // Division is null for intermediate grades
        studyType,
        governorate,
        hashedPassword,
        role: "USER",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REGISTER]", error);
    
    // If the table doesn't exist or there's a database connection issue,
    // return a specific error message
    if (error instanceof Error && (
      error.message.includes("does not exist") || 
      error.message.includes("P2021") ||
      error.message.includes("table")
    )) {
      return new NextResponse("Database not initialized. Please run database migrations.", { status: 503 });
    }
    
    return new NextResponse("Internal Error", { status: 500 });
  }
} 