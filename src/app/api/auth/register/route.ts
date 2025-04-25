import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Validation schema using Zod
const RegisterSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
  // Add other fields like name if needed on signup form
  // name: z.string().min(1, { message: "Name is required" }).optional(), 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = RegisterSchema.safeParse(body);
    if (!validationResult.success) {
      console.warn('[API /auth/register] Invalid registration data:', validationResult.error.flatten());
      return NextResponse.json(
          { 
              error: "Invalid registration data", 
              issues: validationResult.error.flatten().fieldErrors 
          }, 
          { status: 400 }
      );
    }

    const { email, password /*, name */ } = validationResult.data;

    console.log(`[API /auth/register] Attempting to register user: ${email}`);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      console.warn(`[API /auth/register] Registration attempt for existing email: ${email}`);
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 }); // Conflict
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds = 10

    // Create the user (default role is set in schema)
    const newUser = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        // name: name, // Include name if collected
        // emailVerified: null, // Explicitly set if needed, otherwise Prisma adapter handles it
      },
       select: { // Only return necessary fields
           id: true,
           email: true,
           role: true
       }
    });

    console.log(`[API /auth/register] User registered successfully: ${newUser.email}`);

    // TODO: Implement email verification flow if required.
    // - Generate a verification token.
    // - Store the token (e.g., in VerificationToken model from NextAuth adapter).
    // - Send an email with a verification link containing the token.
    // - Create another API endpoint to handle link clicks, verify the token, and mark the user as verified.

    return NextResponse.json(
      { 
          success: true, 
          message: "Registration successful!", 
          user: newUser 
      }, 
      { status: 201 } // Created
    );

  } catch (error) {
    console.error('[API /auth/register] Error during registration:', error);
    return NextResponse.json({ error: "An unexpected error occurred during registration." }, { status: 500 });
  }
} 