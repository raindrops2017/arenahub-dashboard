import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Sign Up | San Siro"
        description="Create an account for San Siro sports venue and pitch management dashboard."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}


