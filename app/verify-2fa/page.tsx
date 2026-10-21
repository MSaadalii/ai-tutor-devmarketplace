import { AuthPageFrame } from "@/components/auth/AuthPageFrame";
import { TotpForm } from "@/components/auth/TotpForm";

export default function Verify2faPage() {
  return (
    <AuthPageFrame
      eyebrow="ACCOUNT SECURITY"
      title="One last little step."
      description="Set up your authenticator or enter its code to securely continue."
    >
      <TotpForm />
    </AuthPageFrame>
  );
}
