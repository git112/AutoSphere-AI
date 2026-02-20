"""
Email Service
Handles sending emails for authentication (password reset, verification)
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails"""
    
    def __init__(self):
        """Initialize email service with SMTP configuration"""
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_user)
        self.from_name = os.getenv("FROM_NAME", "ABGA SaaS")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        
        if not self.smtp_user or not self.smtp_password:
            logger.warning("SMTP credentials not configured. Email sending will fail.")
    
    def send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """
        Send an email
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email content
            
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            
            # Attach HTML content
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(message)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    def send_welcome_email(self, to_email: str, name: str, verification_token: Optional[str] = None) -> bool:
        """
        Send welcome email to new user
        
        Args:
            to_email: User email
            name: User name
            verification_token: Email verification token (optional)
            
        Returns:
            True if sent successfully
        """
        verification_link = f"{self.frontend_url}/verify-email?token={verification_token}" if verification_token else None
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to ABGA SaaS! 🎉</h1>
                </div>
                <div class="content">
                    <h2>Hello {name}!</h2>
                    <p>Thank you for signing up for ABGA SaaS. We're excited to have you on board!</p>
                    <p>Your account has been created successfully. You can now access all our amazing features including AI-powered content generation.</p>
                    {f'<p>Please verify your email address by clicking the button below:</p><a href="{verification_link}" class="button">Verify Email Address</a><p>Or copy this link: {verification_link}</p>' if verification_link else ''}
                    <p>If you have any questions, feel free to reach out to our support team.</p>
                    <p>Best regards,<br>The ABGA SaaS Team</p>
                </div>
                <div class="footer">
                    <p>&copy; 2026 ABGA SaaS. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, "Welcome to ABGA SaaS!", html_content)
    
    def send_password_reset_email(self, to_email: str, name: str, reset_token: str) -> bool:
        """
        Send password reset email
        
        Args:
            to_email: User email
            name: User name
            reset_token: Password reset token
            
        Returns:
            True if sent successfully
        """
        reset_link = f"{self.frontend_url}/reset-password?token={reset_token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset Request 🔐</h1>
                </div>
                <div class="content">
                    <h2>Hello {name}!</h2>
                    <p>We received a request to reset your password for your ABGA SaaS account.</p>
                    <p>Click the button below to reset your password:</p>
                    <a href="{reset_link}" class="button">Reset Password</a>
                    <p>Or copy this link: {reset_link}</p>
                    <div class="warning">
                        <strong>⚠️ Important:</strong>
                        <ul>
                            <li>This link will expire in 1 hour</li>
                            <li>If you didn't request this reset, please ignore this email</li>
                            <li>Your password won't change until you create a new one</li>
                        </ul>
                    </div>
                    <p>Best regards,<br>The ABGA SaaS Team</p>
                </div>
                <div class="footer">
                    <p>&copy; 2026 ABGA SaaS. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, "Password Reset Request - ABGA SaaS", html_content)
    
    def send_verification_email(self, to_email: str, name: str, verification_token: str) -> bool:
        """
        Send email verification email
        
        Args:
            to_email: User email
            name: User name
            verification_token: Email verification token
            
        Returns:
            True if sent successfully
        """
        verification_link = f"{self.frontend_url}/verify-email?token={verification_token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Verify Your Email ✉️</h1>
                </div>
                <div class="content">
                    <h2>Hello {name}!</h2>
                    <p>Please verify your email address to complete your ABGA SaaS registration.</p>
                    <p>Click the button below to verify your email:</p>
                    <a href="{verification_link}" class="button">Verify Email Address</a>
                    <p>Or copy this link: {verification_link}</p>
                    <p>This link will expire in 24 hours.</p>
                    <p>Best regards,<br>The ABGA SaaS Team</p>
                </div>
                <div class="footer">
                    <p>&copy; 2026 ABGA SaaS. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, "Verify Your Email - ABGA SaaS", html_content)


    def send_otp_email(self, to_email: str, name: str, otp: str, purpose: str) -> bool:
        """
        Send OTP email for signup verification or password reset.

        Args:
            to_email: Recipient email address
            name:     Recipient name
            otp:      6-digit OTP code
            purpose:  'signup' | 'password_reset'

        Returns:
            True if sent successfully
        """
        if purpose == "password_reset":
            subject = "Password Reset OTP — AutoSphere"
            heading = "Reset Your Password 🔐"
            body_text = "You requested a password reset for your AutoSphere account."
            action_text = "Use the OTP below to set a new password:"
        else:
            subject = "Verify Your Account — AutoSphere"
            heading = "Verify Your Email ✉️"
            body_text = "Thank you for signing up! One last step — verify your email address."
            action_text = "Enter the OTP below to activate your account:"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .otp-box {{ background: #1a1a2e; border: 2px solid #667eea; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }}
                .otp-code {{ font-size: 42px; font-weight: bold; letter-spacing: 12px; color: #a78bfa; font-family: monospace; }}
                .expiry {{ font-size: 13px; color: #999; margin-top: 10px; }}
                .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; margin: 20px 0; border-radius: 4px; font-size: 14px; }}
                .footer {{ text-align: center; margin-top: 20px; color: #888; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{heading}</h1>
                </div>
                <div class="content">
                    <h2>Hello {name}!</h2>
                    <p>{body_text}</p>
                    <p>{action_text}</p>
                    <div class="otp-box">
                        <div class="otp-code">{otp}</div>
                        <div class="expiry">⏱ This OTP expires in <strong>5 minutes</strong></div>
                    </div>
                    <div class="warning">
                        ⚠️ <strong>Do not share this OTP</strong> with anyone. AutoSphere will never ask for your OTP via phone or chat.
                    </div>
                    <p>If you did not request this, you can safely ignore this email.</p>
                    <p>Best regards,<br>The AutoSphere Team</p>
                </div>
                <div class="footer">
                    <p>&copy; 2026 AutoSphere. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        return self.send_email(to_email, subject, html_content)


# Singleton instance
email_service = EmailService()
