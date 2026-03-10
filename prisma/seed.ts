import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default favorite places...');

  const places = [
    { name: 'Home',        address: '1018 Delaware Street',     city: 'Shreveport',   state: 'LA', zip: '71106', category: 'Home'   },
    { name: 'Envoltz',     address: '1001 M and O Drive',       city: 'Bossier City', state: 'LA', zip: '71111', category: 'Office' },
    { name: 'Sundance',    address: '9010 Sundance Lane',       city: 'Shreveport',   state: 'LA', zip: '71106', category: 'Other'  },
    { name: 'Montessori',  address: '2605 C.E. Galloway Blvd.', city: 'Shreveport',   state: 'LA', zip: '71104', category: 'Other'  },
    { name: 'Beach House', address: '7521 Gulf Boulevard',      city: 'Navarre',      state: 'FL', zip: '32566', category: 'Other'  },
  ];

  for (const place of places) {
    await prisma.favoritePlace.upsert({
      where: { id: place.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        id: place.name.toLowerCase().replace(/\s+/g, '-'),
        ...place,
      },
    });
  }

  console.log('Seeded', places.length, 'favorite places.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
