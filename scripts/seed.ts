import { initializeApp } from "firebase/app";
import { collection, doc, setDoc, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const predefinedQuests = [
  {
    title: "Drink 8 glasses of water",
    description: "Stay hydrated throughout the day",
    schedule: "daily",
    points: 10,
  },
  {
    title: "Read for 15 minutes",
    description: "Take time to read a book or article",
    schedule: "daily",
    points: 15,
  },
  {
    title: "Exercise for 30 minutes",
    description: "Go for a walk, run, or workout",
    schedule: "daily",
    points: 20,
  },
  {
    title: "Organize your workspace",
    description: "Keep your desk tidy and organized",
    schedule: "daily",
    points: 10,
  },
  {
    title: "Send a sweet text to your partner",
    description: "Show your partner you're thinking of them",
    schedule: "daily",
    points: 15,
  },
  {
    title: "Give a genuine compliment",
    description: "Make your partner feel appreciated",
    schedule: "daily",
    points: 10,
  },
  {
    title: "Plan a date night",
    description: "Plan and organize a date for the week",
    schedule: "weekly",
    points: 30,
  },
  {
    title: "Cook a meal together",
    description: "Spend time cooking something special together",
    schedule: "weekly",
    points: 25,
  },
  {
    title: "Write a love letter",
    description: "Write a heartfelt letter to your partner",
    schedule: "weekly",
    points: 30,
  },
  {
    title: "Take a walk together",
    description: "Enjoy a relaxing walk and quality time",
    schedule: "weekly",
    points: 20,
  },
  {
    title: "Anniversary celebration",
    description: "Plan something special for your anniversary",
    schedule: "special",
    points: 100,
  },
];

const predefinedRewards = [
  {
    title: "Make a cup of coffee",
    description: "Partner makes your favorite coffee",
    pointCost: 20,
  },
  {
    title: "15-minute massage",
    description: "Relax with a 15-minute massage from your partner",
    pointCost: 30,
  },
  {
    title: "Pick the weekend movie",
    description: "You get to choose what to watch this weekend",
    pointCost: 40,
  },
  {
    title: "Day off from chores",
    description: "Your partner handles all household chores today",
    pointCost: 60,
  },
  {
    title: "Small gift",
    description: "Partner buys you a small surprise gift",
    pointCost: 80,
  },
  {
    title: "Plan a date night",
    description: "Partner plans and pays for a full date night",
    pointCost: 100,
  },
];

async function seed() {
  console.log("Seeding predefined quests...");
  for (const quest of predefinedQuests) {
    const ref = doc(collection(db, "quests"));
    await setDoc(ref, {
      ...quest,
      userId: "__template__",
      status: "active",
      createdBy: "__template__",
      active: true,
      createdAt: new Date(),
    });
    console.log(`  ✓ ${quest.title}`);
  }

  console.log("Seeding predefined rewards...");
  for (const reward of predefinedRewards) {
    const ref = doc(collection(db, "rewards"));
    await setDoc(ref, {
      ...reward,
      userId: "__template__",
      status: "available",
      createdBy: "__template__",
      createdAt: new Date(),
    });
    console.log(`  ✓ ${reward.title}`);
  }

  console.log("Done! Collections created with template data.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
