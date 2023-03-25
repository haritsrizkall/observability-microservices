import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const level = await prisma.level.createMany({
        data: [
            {
                id: 1,
                name: 'FRESH',
            },
            {
                id: 2,
                name: 'REGULAR',
            },
            {
                id: 3,
                name: 'SUPER',
            },
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