import { db } from "../src/lib/db";

async function main() {
  const quoteCount = await db.quote.count();
  if (quoteCount === 0) {
    const samples = [
      {
        text: "I'm not arguing, I'm just explaining why I'm right.",
        author: "Dad",
        dateSaid: new Date(Date.UTC(2025, 5, 14)),
        context: "During a debate about how to load the dishwasher",
        tags: "dad-jokes, classic",
        rating: 4,
        favorite: true,
      },
      {
        text: "Why walk when you can be carried? That's my whole philosophy.",
        author: "Mia (age 4)",
        dateSaid: new Date(Date.UTC(2025, 6, 2)),
        context: "Refusing to walk from the car to the front door",
        tags: "kids, relatable",
        rating: 5,
        favorite: true,
      },
      {
        text: "I put the 'pro' in procrastinate. Eventually.",
        author: "Alex",
        dateSaid: new Date(Date.UTC(2025, 4, 20)),
        context: "Office Slack, #random channel",
        tags: "work, self-aware",
        rating: 3,
        favorite: false,
      },
      {
        text: "My doctor said walk 10,000 steps a day. I asked if pacing counts. He sighed.",
        author: "Grandma",
        dateSaid: new Date(Date.UTC(2025, 3, 8)),
        context: "Family phone call",
        tags: "health, grandma",
        rating: 4,
        favorite: false,
      },
      {
        text: "I'm on a seafood diet. I see food and I eat it.",
        author: "Uncle Ray",
        dateSaid: new Date(Date.UTC(2025, 0, 1)),
        context: "New Year's dinner, right on cue",
        tags: "dad-jokes, holidays",
        rating: 2,
        favorite: false,
      },
      {
        text: "WiFi went down for five minutes, so I had to talk to my family. They seem like nice people.",
        author: "Jordan",
        dateSaid: new Date(Date.UTC(2025, 6, 18)),
        context: "Tweeted during the great outage of July",
        tags: "relatable, tech",
        rating: 5,
        favorite: false,
      },
    ];

    for (const s of samples) {
      await db.quote.create({ data: s });
    }
    console.log(`Seeded ${samples.length} sample quotes.`);
  } else {
    console.log(`Already have ${quoteCount} quotes, skipping quote seed.`);
  }

  // Seed a sample group if none exist.
  const groupCount = await db.group.count();
  if (groupCount === 0) {
    const group = await db.group.create({
      data: {
        name: "Family Group Chat",
        description: "The greatest hits from the family thread.",
        ownerName: "you",
        members: {
          create: [
            { name: "you", role: "owner" },
            { name: "Dad", role: "member" },
            { name: "Mia", role: "member" },
            { name: "Grandma", role: "member" },
          ],
        },
      },
    });

    // Assign a couple of the existing quotes to this group.
    const dad = await db.quote.findFirst({ where: { author: "Dad" } });
    const mia = await db.quote.findFirst({ where: { author: "Mia (age 4)" } });
    const grandma = await db.quote.findFirst({
      where: { author: "Grandma" },
    });
    if (dad) await db.quote.update({ where: { id: dad.id }, data: { groupId: group.id } });
    if (mia) await db.quote.update({ where: { id: mia.id }, data: { groupId: group.id } });
    if (grandma)
      await db.quote.update({
        where: { id: grandma.id },
        data: { groupId: group.id },
      });

    console.log(`Seeded sample group "${group.name}" with members + 3 quotes.`);
  } else {
    console.log(`Already have ${groupCount} groups, skipping group seed.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
