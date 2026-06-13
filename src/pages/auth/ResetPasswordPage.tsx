import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
// Reset password flow is handled entirely in ForgotPasswordPage (3-step OTP)
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/forgot-password', { replace: true }) }, [navigate])
  return null
}
