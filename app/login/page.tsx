import { Metadata } from "next"
import { LoginForm } from "components/login/LoginForm"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Sign in - Haven",
  description: "Automate your SDA business with Haven",
  robots: "noindex, nofollow",
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-gray-900">
      {/* Left-aligned background image */}
      <div className="absolute left-0 top-0 h-full w-[60%] hidden lg:block bg-gray-900">
        <Image
          src="/assets/ChatGPT Image Oct 11, 2025, 06_46_56 PM.png"
          alt="Haven - A warm welcome"
          fill
          className="object-cover object-left"
          priority
        />
      </div>

      {/* Right side - Login form (overlay) */}
      <div className="absolute right-0 top-0 flex h-full w-[40%] items-center justify-center bg-white/95 px-6 lg:px-12">
        <div className="w-full max-w-md space-y-8">
          {/* Login form */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
              <p className="mt-2 text-sm text-gray-600">
                Sign in to your account to continue
              </p>
            </div>

            <div className="mt-8">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile form (full width on mobile) */}
      <div className="relative z-10 flex w-full items-center justify-center bg-white px-6 lg:hidden">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile-only branding */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900">Haven</h1>
            <p className="mt-2 text-sm text-gray-600">Automate your SDA business</p>
          </div>

          {/* Login form */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
              <p className="mt-2 text-sm text-gray-600">
                Sign in to your account to continue
              </p>
            </div>

            <div className="mt-8">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}