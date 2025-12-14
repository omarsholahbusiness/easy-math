// Quick script to check if Accelerate is configured
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const accelerateUrl = process.env.PRISMA_ACCELERATE_URL;
const databaseUrl = process.env.DATABASE_URL;
const directDatabaseUrl = process.env.DIRECT_DATABASE_URL;

console.log('\n📋 Prisma Accelerate Configuration Check\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (accelerateUrl) {
    console.log('✅ PRISMA_ACCELERATE_URL is set');
    console.log('   URL:', accelerateUrl.substring(0, 60) + '...\n');
    console.log('🚀 Accelerate should be ACTIVE when you make database queries\n');
} else {
    console.log('❌ PRISMA_ACCELERATE_URL is NOT set');
    console.log('   Accelerate will NOT be used\n');
}

if (databaseUrl) {
    console.log('✅ DATABASE_URL is set');
    const hasConnectionLimit = databaseUrl.includes('connection_limit');
    console.log('   Has connection_limit:', hasConnectionLimit ? 'Yes ✅' : 'No ⚠️');
    if (!hasConnectionLimit && accelerateUrl) {
        console.log('   ⚠️  Recommendation: Add ?connection_limit=1 to DATABASE_URL when using Accelerate');
    }
} else {
    console.log('❌ DATABASE_URL is NOT set');
}

if (directDatabaseUrl) {
    console.log('✅ DIRECT_DATABASE_URL is set');
} else {
    console.log('⚠️  DIRECT_DATABASE_URL is NOT set (optional, but recommended for migrations)');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (accelerateUrl) {
    console.log('💡 To see Accelerate in action:');
    console.log('   1. Make sure your dev server is running');
    console.log('   2. Visit a page that queries the database');
    console.log('   3. Check your terminal for: "🚀 [Prisma] Using Accelerate with Node Client"');
    console.log('   4. Check Prisma Cloud dashboard for query metrics\n');
} else {
    console.log('💡 To enable Accelerate:');
    console.log('   1. Add PRISMA_ACCELERATE_URL to your .env or .env.local file');
    console.log('   2. Restart your dev server\n');
}

