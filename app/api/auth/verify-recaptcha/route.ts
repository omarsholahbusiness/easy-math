import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ success: false, error: "Missing token" }, { status: 400 });
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      console.error("[RECAPTCHA] Secret key not configured");
      // In development, allow requests without verification
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({ success: true, message: "Development mode: skipping verification" });
      }
      return NextResponse.json({ success: false, error: "reCAPTCHA not configured" }, { status: 500 });
    }

    // Verify token with Google
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify`;
    const response = await fetch(verificationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();

    console.log("[RECAPTCHA_VERIFY] Google response:", {
      success: data.success,
      "error-codes": data["error-codes"],
      score: data.score,
      challenge_ts: data["challenge_ts"],
      hostname: data.hostname,
    });

    if (data.success) {
      // For v2, there's no score - just success/failure
      // For v3, check score if available
      if (data.score !== undefined) {
        const score = data.score;
        const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE || "0.5");

        if (score < minScore) {
          return NextResponse.json(
            { success: false, error: "Low reCAPTCHA score", score },
            { status: 400 }
          );
        }

        return NextResponse.json({ success: true, score });
      }

      // v2 - just return success
      return NextResponse.json({ success: true });
    } else {
      const errorCodes = data["error-codes"] || [];
      console.error("[RECAPTCHA_VERIFY] Verification failed with error codes:", errorCodes);
      
      // Provide more specific error messages
      let errorMessage = "reCAPTCHA verification failed";
      if (errorCodes.includes("invalid-input-response")) {
        errorMessage = "reCAPTCHA token is invalid or expired";
      } else if (errorCodes.includes("invalid-input-secret")) {
        errorMessage = "reCAPTCHA secret key is invalid";
      } else if (errorCodes.includes("timeout-or-duplicate")) {
        errorMessage = "reCAPTCHA token expired. Please verify again";
      } else if (errorCodes.includes("bad-request")) {
        errorMessage = "Invalid reCAPTCHA request";
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage, 
          errors: errorCodes 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[RECAPTCHA_VERIFY]", error);
    return NextResponse.json({ success: false, error: "Verification error" }, { status: 500 });
  }
}

