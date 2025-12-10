import { PrismaClient } from "@prisma/client";

// Use DIRECT_DATABASE_URL for migrations/scripts to bypass Accelerate
const datasourceUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!datasourceUrl) {
  throw new Error("Missing DIRECT_DATABASE_URL or DATABASE_URL environment variable.");
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: datasourceUrl,
    },
  },
});

async function resetUsers() {
  try {
    console.log("🔄 Starting User table reset...");

    // Count users before deletion
    const userCount = await prisma.user.count();
    console.log(`📊 Found ${userCount} users to delete`);

    if (userCount === 0) {
      console.log("✅ No users to delete. Table is already empty.");
      return;
    }

    // Delete all users (cascade will handle related records)
    const result = await prisma.user.deleteMany({});

    console.log(`✅ Successfully deleted ${result.count} users`);
    console.log("✅ All related records (courses, purchases, progress, etc.) have been cascade deleted");

    // Verify deletion
    const remainingUsers = await prisma.user.count();
    console.log(`📊 Remaining users: ${remainingUsers}`);

    if (remainingUsers === 0) {
      console.log("✅ User table reset completed successfully!");
    } else {
      console.warn(`⚠️  Warning: ${remainingUsers} users still remain`);
    }
  } catch (error) {
    console.error("❌ Error resetting User table:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resetUsers()
  .then(() => {
    console.log("✨ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });

