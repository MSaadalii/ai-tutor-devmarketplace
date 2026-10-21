import Link from "next/link";
import { AuthPageFrame } from "@/components/auth/AuthPageFrame";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthPageFrame
      eyebrow="WELCOME BACK"
      title="Good to see you again."
      description="Sign in to continue learning, one clear step at a time."
      footer={<>New to Visual AI Tutor? <Link href="/signup" className="auth-text-link">Create an account <span aria-hidden="true">→</span></Link></>}
    >
      <LoginForm />
    </AuthPageFrame>
  );
}
