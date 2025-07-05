import PasswordResetRequestForm from "@/components/auth/PasswordResetRequestForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const PasswordResetRequest = () => {
  return (
    <div className="container max-w-md mx-auto px-4 py-16">
      <Card className="w-full">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>Enter your email to receive a reset link</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordResetRequestForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordResetRequest;
