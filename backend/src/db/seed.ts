import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, friendships, foodLogs } from './schema.js';
import bcrypt from 'bcryptjs';

async function seed() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/weat';
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Create demo users
  const [userA] = await db
    .insert(users)
    .values({
      displayName: 'User A (Demo)',
      email: 'usera@weat.demo',
      passwordHash,
      currentCraving: 'Bún Bò Huế',
      locationEnabled: true,
    })
    .returning();

  const [userB] = await db
    .insert(users)
    .values({
      displayName: 'User B (Demo)',
      email: 'userb@weat.demo',
      passwordHash,
      currentCraving: 'Phở Bò',
      locationEnabled: true,
    })
    .returning();

  const [userC] = await db
    .insert(users)
    .values({
      displayName: 'User C (Demo)',
      email: 'userc@weat.demo',
      passwordHash,
      currentCraving: 'Cơm Tấm',
      locationEnabled: true,
    })
    .returning();

  console.log('Created users:', userA.id, userB.id, userC.id);

  // Create friendship between A and B
  await db.insert(friendships).values({
    requesterId: userA.id,
    addresseeId: userB.id,
    status: 'accepted',
  });

  console.log('Created friendship: A <-> B');

  // Create sample food logs
  await db.insert(foodLogs).values([
    {
      userId: userA.id,
      imageUrl: '/demo/bun-bo.jpg',
      dishName: 'Bún Bò Huế',
      confidence: 0.95,
      tags: JSON.stringify(['nước', 'cay', 'bò']),
    },
    {
      userId: userB.id,
      imageUrl: '/demo/pho-bo.jpg',
      dishName: 'Phở Bò',
      confidence: 0.92,
      tags: JSON.stringify(['nước', 'bò', 'thanh']),
    },
    {
      userId: userA.id,
      imageUrl: '/demo/banh-mi.jpg',
      dishName: 'Bánh Mì Thịt',
      confidence: 0.88,
      tags: JSON.stringify(['khô', 'thịt', 'giòn']),
    },
  ]);

  console.log('Created sample food logs');
  console.log('Seed completed!');

  await sql.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
