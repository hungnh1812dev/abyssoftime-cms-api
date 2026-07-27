export interface BuildResetPasswordEmailHtmlParams {
  resetUrl: string;
}

export function buildResetPasswordEmailHtml({ resetUrl }: BuildResetPasswordEmailHtmlParams): string {
  return `
<!DOCTYPE html>
<html>
  <body style="font-family: sans-serif; background-color: #f4f4f5; padding: 24px;">
    <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px;">
      <h1 style="font-size: 20px; margin-bottom: 16px;">Reset your password</h1>
      <p style="font-size: 14px; color: #333;">We received a request to reset your password. Click the button below to choose a new one:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px;">Reset password</a>
      </p>
      <p style="font-size: 12px; color: #666;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    </div>
  </body>
</html>
`.trim();
}
