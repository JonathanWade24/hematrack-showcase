const { PrismaClient } = require('../src/generated/prisma')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    console.error('Please provide ADMIN_EMAIL and ADMIN_PASSWORD environment variables')
    process.exit(1)
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
      },
    })

    console.log('Admin user created successfully:', {
      id: user.id,
      email: user.email,
      role: user.role,
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.error(`Error: A user with the email "${email}" already exists.`)
    } else {
      console.error('Error creating admin user:', error)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main() 