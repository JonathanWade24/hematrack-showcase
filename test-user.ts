const { PrismaClient } = require('./src/generated/prisma')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = 'test@example.com'
  const password = 'TestPass123!'
  
  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Test User',
        role: 'admin',
      },
    })

    console.log('Test user created:', {
      id: user.id,
      email: user.email,
      role: user.role,
      password: password // showing the plain password for testing
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main() 