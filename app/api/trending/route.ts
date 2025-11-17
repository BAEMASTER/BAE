// app/api/trending/route.ts
export async function GET() {
  // temporary mock data
  const topics = [
    { topic: "World Series Game 7", category: "Sports" },
    { topic: "AI Breakthroughs", category: "Tech" },
    { topic: "Climate Summit", category: "World" },
    { topic: "New Space Discovery", category: "Science" },
    { topic: "Market News", category: "Finance" },
    { topic: "Viral Moment", category: "Culture" },
    { topic: "Tech Drama", category: "Tech" },
    { topic: "Olympic Trials", category: "Sports" },
  ];
  return Response.json({ topics, refreshedAt: new Date().toISOString() });
}
