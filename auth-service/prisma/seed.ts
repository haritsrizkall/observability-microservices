import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const role = await prisma.role.createMany({
        data: [
            {
                id: 1,
                name: 'admin',
            },
            {
                id: 2,
                name: 'user',
            },
        ],
        skipDuplicates: true,
    })
    const user = await prisma.user.create({
        data: {
            email: 'admin@gmail.com',
            password: 'admin',
            roleId: 1,
            profile: {
                create: {
                    name: 'admin',
                },
            },
        },
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