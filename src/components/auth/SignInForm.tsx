import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import { useDashboardAuth } from "../../context/DashboardAuthContext";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(true);
  const [email, setEmail] = useState("admin@venue.com");
  const [password, setPassword] = useState("Admin@123456");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, quickSuperAdminLogin } = useDashboardAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        navigate("/", { replace: true });
      } else {
        setErrorMsg("Invalid credentials. Please check your email and password.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Invalid credentials. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handle1TapSuperAdmin = async () => {
    setEmail("admin@venue.com");
    setPassword("Admin@123456");
    setErrorMsg("");
    setLoading(true);
    try {
      const success = await quickSuperAdminLogin();
      if (success) {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed 1-tap SuperAdmin login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Back to dashboard
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign In to VenueOps
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Live NestJS Backend Connected: Enter your admin credentials to access the venue management dashboard.
            </p>
          </div>

          {/* 1-Tap Live SuperAdmin Button & Credentials Box */}
          <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/60">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                ⚡ Live SuperAdmin Login
              </div>
              <button
                type="button"
                onClick={handle1TapSuperAdmin}
                disabled={loading}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm disabled:opacity-50"
              >
                1-Tap Login
              </button>
            </div>
            <div className="space-y-1.5 text-xs text-blue-900 dark:text-blue-200">
              <div className="flex items-center justify-between">
                <span className="font-medium">SuperAdmin:</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@venue.com");
                    setPassword("Admin@123456");
                  }}
                  className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                >
                  admin@venue.com
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Password:</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">Admin@123456</span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <Label>
                    Email Address <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@venue.com"
                  />
                </div>
                <div>
                  <Label>
                    Password <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Keep me logged in
                    </span>
                  </div>
                  <Link
                    to="#"
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div>
                  <Button className="w-full" size="sm" type="submit" disabled={loading}>
                    {loading ? "Signing In..." : "Sign In to Dashboard"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
