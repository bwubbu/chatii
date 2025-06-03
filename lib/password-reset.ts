"use server"

import { randomBytes } from "crypto"

// In a real application, you would store these in a database
const resetTokens = new Map<string, { email: string; expires: Date }>()

export async function sendPasswordResetEmail(email: string) {
  try {
    // Generate a secure random token
    const token = randomBytes(32).toString("hex")

    // Set expiration time (1 hour from now)
    const expires = new Date(Date.now() + 60 * 60 * 1000)

    // Store token (in production, store in database)
    resetTokens.set(token, { email, expires })

    // Create reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`

    // In production, you would send an actual email here
    // For demo purposes, we'll just log the reset URL
    console.log(`Password reset email would be sent to ${email}`)
    console.log(`Reset URL: ${resetUrl}`)

    // Example email content that would be sent:
    const emailContent = {
      to: email,
      subject: "Reset Your Chatii Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p>You requested a password reset for your Chatii account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This email was sent by Chatii. If you have any questions, please contact our support team.</p>
        </div>
      `,
    }

    // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
    // await emailService.send(emailContent)

    return { success: true, message: "Password reset email sent successfully" }
  } catch (error) {
    console.error("Failed to send password reset email:", error)
    return { success: false, message: "Failed to send password reset email" }
  }
}

export async function validateResetToken(token: string) {
  const tokenData = resetTokens.get(token)

  if (!tokenData) {
    throw new Error("Invalid token")
  }

  if (new Date() > tokenData.expires) {
    resetTokens.delete(token)
    throw new Error("Token expired")
  }

  return { email: tokenData.email }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    const tokenData = await validateResetToken(token)

    // Here you would hash the password and update it in your database
    // const hashedPassword = await bcrypt.hash(newPassword, 12)
    // await updateUserPassword(tokenData.email, hashedPassword)

    // Remove the used token
    resetTokens.delete(token)

    console.log(`Password reset successfully for ${tokenData.email}`)

    return { success: true, message: "Password reset successfully" }
  } catch (error) {
    console.error("Failed to reset password:", error)
    throw new Error("Failed to reset password")
  }
}
