import Link from "next/link";
import { AuthPageFrame } from "@/components/auth/AuthPageFrame";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <AuthPageFrame
      eyebrow="YOUR NEXT CHAPTER"
      title="Let’s make learning click."
      description="Create your account and get ready for clearer, more visual lessons."
      footer={<>Already have an account? <Link href="/login" className="auth-text-link">Sign in <span aria-hidden="true">→</span></Link></>}
    >
      <SignupForm />
    </AuthPageFrame>
  );
}
