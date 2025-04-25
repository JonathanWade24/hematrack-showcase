const { PrismaClient } = require('./src/generated/prisma')
const prisma = new PrismaClient()

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: 'admin@email.com'
      }
    })
    console.log('User found:', user)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main() 