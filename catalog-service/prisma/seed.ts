import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const category = await prisma.category.createMany({
        data: [
            {
                id: 1,
                name: 'Bunga Papan'
            },
            {
                id: 2,
                name: 'Hand Bouquet'
            },
            {
                id: 3,
                name: 'Dekorasi'
            }
        ],
        skipDuplicates: true,
    })
}

main()
  .then(async () => {
    console.log('Seeding completed')
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })