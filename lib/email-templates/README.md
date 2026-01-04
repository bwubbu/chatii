# Email Templates for RamahAI

This directory contains custom email templates for RamahAI authentication emails.

## Available Templates

1. **confirmation-email.html** - Beautiful confirmation email for new user signups
2. **password-reset-email.html** - Styled password reset email

## How to Use in Supabase Dashboard

### Step-by-Step Instructions

1. **Log in to your Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Navigate to Email Templates**
   - Go to **Authentication** → **Email Templates** (in the left sidebar)
   - You'll see a list of email templates

3. **Update the Confirmation Email Template**
   - Click on the **Confirm signup** template
   - In the **Subject** field, you can use: `Confirm Your RamahAI Account`
   - In the **Body (HTML)** field, copy and paste the entire contents of `confirmation-email.html`
   - **Important:** Make sure to keep the `{{ .ConfirmationURL }}` variable - this is where Supabase will insert the confirmation link

4. **Update the Password Reset Email Template (Optional)**
   - Click on the **Reset password** template
   - In the **Subject** field, you can use: `Reset Your RamahAI Password`
   - In the **Body (HTML)** field, copy and paste the entire contents of `password-reset-email.html`
   - Keep the `{{ .ConfirmationURL }}` variable

5. **Save Changes**
   - Click **Save** at the bottom of the page
   - Your new email templates are now active!

### Template Variables

Supabase provides these variables you can use in the templates:
- `{{ .ConfirmationURL }}` - The confirmation/reset link URL (required)
- `{{ .Email }}` - User's email address
- `{{ .SiteURL }}` - Your site URL
- `{{ .RedirectTo }}` - Redirect URL after confirmation/reset

### Customization

You can modify the templates to match your brand:
- **Colors:** The templates use RamahAI's dark theme:
  - Background: `#171717` (outer), `#0F0F0F` (card)
  - Text: `#FFFFFF` (headings), `#D1D5DB` (body), `#9CA3AF` (secondary)
  - Button: `#FFFFFF` (background), `#171717` (text)
- **Text:** Modify any of the text content to match your messaging
- **Logo:** You can add an image tag with your logo URL in the header section

### Testing

After updating the templates:
1. Sign up a new test account (for confirmation email)
2. Request a password reset (for password reset email)
3. Check the email inbox for the styled emails
4. Verify the styling looks correct across different email clients
5. Test that the confirmation/reset links work correctly

### Email Client Compatibility

These templates are designed to work across major email clients:
- ✅ Gmail (web, iOS, Android)
- ✅ Outlook (web, desktop, mobile)
- ✅ Apple Mail
- ✅ Yahoo Mail
- ✅ And other modern email clients

The templates use:
- Inline CSS for maximum compatibility
- Table-based layout for email client support
- Web-safe fonts with fallbacks
- Responsive design principles
- MSO conditional comments for Outlook support

### Troubleshooting

**The email looks broken:**
- Make sure you copied the entire HTML, including the `<!DOCTYPE html>` declaration
- Check that `{{ .ConfirmationURL }}` is still present in the template
- Some email clients strip certain CSS - the template uses inline styles for maximum compatibility

**The confirmation link doesn't work:**
- Verify that `{{ .ConfirmationURL }}` is present in both the button link and the text link
- Check your Supabase project's site URL configuration

**Styling looks different in some clients:**
- This is normal - email clients have varying CSS support
- The template is optimized for the most common clients
- Test in your target email clients before deploying

