import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const { email, name, template } = await req.json()

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing RESEND_API_KEY environment variable',
        message: 'Welcome email functionality not configured'
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      },
    )
  }

  const welcomeEmailTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to GENBOOK.AI</title>
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            background: linear-gradient(135deg, #0a0a0a 0%, #0f172a 50%, #1a1a2e 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: rgba(0,0,0,0.8);
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid rgba(6, 182, 212, 0.2);
        }
        .header { 
            background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
            padding: 40px 30px; 
            text-align: center;
        }
        .header h1 { 
            color: #000; 
            margin: 0; 
            font-size: 32px; 
            font-weight: bold;
        }
        .content { 
            padding: 40px 30px; 
            color: #e5e7eb;
        }
        .welcome-message { 
            font-size: 20px; 
            margin-bottom: 20px; 
            color: #06b6d4;
        }
        .features {
            background: rgba(6, 182, 212, 0.1);
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            border: 1px solid rgba(6, 182, 212, 0.2);
        }
        .feature {
            display: flex;
            align-items: center;
            margin: 15px 0;
        }
        .feature-icon {
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
            border-radius: 50%;
            margin-right: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: #000;
            font-size: 14px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
            color: #000;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
        }
        .footer {
            background: rgba(0,0,0,0.5);
            padding: 20px 30px;
            text-align: center;
            color: #9ca3af;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>GENBOOK.AI</h1>
        </div>
        <div class="content">
            <div class="welcome-message">
                Welcome to GENBOOK.AI, ${name || 'Friend'}! 🎉
            </div>
            <p>
                Congratulations! Your account has been successfully created and verified. 
                You're now ready to experience the future of appointment booking with AI-powered scheduling.
            </p>
            
            <div class="features">
                <h3 style="color: #06b6d4; margin-top: 0;">What you can do now:</h3>
                <div class="feature">
                    <div class="feature-icon">📅</div>
                    <span>Book and manage appointments with ease</span>
                </div>
                <div class="feature">
                    <div class="feature-icon">🤖</div>
                    <span>Get AI-powered scheduling suggestions</span>
                </div>
                <div class="feature">
                    <div class="feature-icon">👥</div>
                    <span>Manage contacts and client relationships</span>
                </div>
                <div class="feature">
                    <div class="feature-icon">📊</div>
                    <span>View detailed reports and analytics</span>
                </div>
                <div class="feature">
                    <div class="feature-icon">🎙️</div>
                    <span>Use voice commands for quick actions</span>
                </div>
            </div>

            <p>
                Your account is fully activated and ready to use. No additional verification steps required!
            </p>

            <p style="text-align: center;">
                <a href="http://localhost:5179" class="cta-button">Start Booking Appointments</a>
            </p>

            <p>
                If you have any questions or need assistance, feel free to reach out to our support team.
            </p>

            <p>
                Best regards,<br>
                <strong style="color: #06b6d4;">The GENBOOK.AI Team</strong>
            </p>
        </div>
        <div class="footer">
            <p>
                This email was sent to ${email} because you created an account with GENBOOK.AI.
            </p>
            <p>
                © 2024 GENBOOK.AI. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'GENBOOK.AI <welcome@genbook.ai>',
        to: [email],
        subject: '🎉 Welcome to GENBOOK.AI - Your Account is Ready!',
        html: welcomeEmailTemplate,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Welcome email sent successfully',
          emailId: data.id 
        }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 200 
        },
      )
    } else {
      const error = await res.text()
      console.error('Resend API error:', error)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email',
          details: error,
          fallback: 'User account created successfully but email notification failed'
        }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 500 
        },
      )
    }
  } catch (error) {
    console.error('Email sending error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Email service error',
        message: 'Account created successfully but welcome email could not be sent',
        details: error.message
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      },
    )
  }
})
