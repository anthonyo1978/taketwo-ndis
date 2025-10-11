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
    <div className="flex min-h-screen">
      {/* Left side - Haven background image (full width) */}
      <div className="relative hidden lg:block lg:w-full">
        <Image
          src="/assets/haven-welcome.png"
          alt="Haven - A warm welcome"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Right side - Login form (overlay) */}
      <div className="absolute right-0 top-0 flex h-full w-[40%] items-center justify-center bg-white/95 px-6 lg:px-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile-only branding */}
          <div className="text-center lg:hidden">
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
