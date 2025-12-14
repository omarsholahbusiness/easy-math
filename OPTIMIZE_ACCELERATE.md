# Accelerate Query Optimization Guide

## Changes Made to Reduce Accelerate Usage

### 1. **Enabled Accelerate Caching**
- Added TTL (Time To Live) of 60 seconds to Accelerate cache
- Queries are now cached for 1 minute, reducing duplicate queries

### 2. **Optimized N+1 Query Problems**

**Before:** Dashboard made separate queries for each course (N+1 problem)
```typescript
// BAD: Makes 1 query per course
await Promise.all(courses.map(async (course) => {
  await db.userProgress.count({ ... }); // Query 1
  await db.quizResult.findMany({ ... }); // Query 2
}));
```

**After:** Batch all queries into 2 total queries
```typescript
// GOOD: Makes only 2 queries total
const allCompletedChapters = await db.userProgress.findMany({ ... }); // 1 query
const allCompletedQuizzes = await db.quizResult.findMany({ ... }); // 1 query
// Then calculate in memory
```

**Impact:** Reduced from N*2 queries to 2 queries (where N = number of courses)

### 3. **Removed Duplicate Queries**
- Dashboard was fetching quiz results twice - now fetches once
- Course sidebar had duplicate useEffect calls - removed duplicate

### 4. **Added Next.js Revalidation**
- API routes now cache for 60 seconds using `revalidate = 60`
- Reduces server-side queries

### 5. **Added HTTP Cache Headers**
- Public routes: `Cache-Control: public, s-maxage=60, stale-while-revalidate=120`
- Private routes: `Cache-Control: private, s-maxage=30, stale-while-revalidate=60`
- Browser and CDN can cache responses

### 6. **Removed Cache-Busting Timestamps**
- Removed `?t=${Date.now()}` from API calls
- Allows browser and Accelerate to cache responses

## Expected Query Reduction

### Dashboard Page
- **Before:** ~15-20 queries per page load
- **After:** ~8-10 queries per page load
- **Reduction:** ~50%

### Courses API
- **Before:** N+1 queries (1 + N*2 queries for N courses)
- **After:** 3-4 queries total regardless of course count
- **Reduction:** ~80-90% for pages with multiple courses

### Home Page
- **Before:** 1 query per page load (no caching)
- **After:** 1 query per 60 seconds (cached)
- **Reduction:** ~95% for repeat visitors

## Additional Optimization Tips

### 1. **Monitor Query Usage**
Check Prisma Cloud dashboard to see query patterns:
- Which routes make the most queries?
- Are there any unexpected query spikes?

### 2. **Increase Cache TTL for Static Data**
For data that rarely changes, increase cache time:
```typescript
export const revalidate = 300; // 5 minutes
```

### 3. **Use Server Components**
Convert client components to server components where possible:
- Server components are cached by Next.js
- Reduces client-side API calls

### 4. **Implement Request Deduplication**
For frequently accessed data, consider:
- React Query with staleTime
- SWR with revalidation
- Next.js unstable_cache

### 5. **Disable Accelerate in Development**
To save quota during development:
```env
# Comment out in .env.local for development
# PRISMA_ACCELERATE_URL="..."
```

## Monitoring

After deploying these changes:
1. Monitor Accelerate dashboard for 24 hours
2. Check query count reduction
3. Verify cache hit rate is increasing
4. Adjust cache TTLs if needed

## If Still Using Too Much

1. **Increase cache times** for static data
2. **Add more aggressive caching** to frequently accessed routes
3. **Consider disabling Accelerate** for development/testing
4. **Use direct connection** for admin/internal routes
5. **Implement pagination** to reduce data fetched per query

