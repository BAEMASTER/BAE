import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

const seedUsers = [
  {
    displayName: "Alex M",
    location: "Brooklyn",
    interests: ["Sourdough baking", "Meditation", "Sci-fi novels", "Indie gaming", "Coffee culture"],
    isSeedData: true,
    createdAt: new Date().toISOString()
  },
  {
    displayName: "Sarah K",
    location: "Austin",
    interests: ["Yoga", "Poetry", "Ethiopian food", "Film photography", "Jazz piano"],
    isSeedData: true,
    createdAt: new Date().toISOString()
  },
  {
    displayName: "Marcus T",
    location: "Portland",
    interests: ["Trail running", "Craft beer", "Podcasts", "Philosophy", "Mountain biking"],
    isSeedData: true,
    createdAt: new Date().toISOString()
  },
  {
    displayName: "Priya R",
    location: "Seattle",
    interests: ["Indian cooking", "Bollywood", "Hiking", "Graphic design", "Tea culture"],
    isSeedData: true,
    createdAt: new Date().toISOString()
  },
  {
    displayName: "Jordan L",
    location: "Chicago",
    interests: ["Stand-up comedy", "Pizza", "Basketball", "Vinyl records", "Street art"],
    isSeedData: true,
    createdAt: new Date().toISOString()
  },
  {
    displayName: "Elena V",
    location: "Miami",
    interests: ["Salsa dancing", "Latin music", "Beach volleyball", "Marine biology", "Sunset photography"],
    isSeedData: true,
    createdAt: new Date().toISOString()
  },
  {
    displayName: "Chris B",
    location: "Denver",
    interests: ["Rock climbing", "Craft cocktails", "Astronomy", "Snowboarding", "Acoustic guitar"],
    isSeedData: true,
    createdAt: new Date().toISOString()
  },
  {
    displayName: "Maya S",
    location: "San Francisco",
    interests: ["Startup culture", "Mindfulness", "Matcha", "Tech conferences", "Urban gardening"],
    isSeedData: true,
    createdAt: new Date().toISOString()
  },
  {
    displayName: "Devon H",
    location: "Nashville",
    interests: ["Country music", "BBQ", "Songwriting", "Live concerts", "Whiskey tasting"],
    isSeedData: true,
    createdAt: new Date().toISOString()
  },
  {
    displayName: "Zara N",
    location: "Boston",
    interests: ["Book clubs", "True crime podcasts", "Cooking shows", "Wine tasting", "Museums"],
    isSeedData: true,
    createdAt: new Date().toISOString()
  }
];

export async function GET() {
  try {
    const results = [];
    
    for (const user of seedUsers) {
      const docRef = await addDoc(collection(db, 'users'), user);
      results.push({ name: user.displayName, id: docRef.id });
    }
    
    return Response.json({ 
      success: true, 
      message: 'Seed users added!',
      users: results 
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}