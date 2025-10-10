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
      {/* Left side - Warm background image with overlay text */}
      <div className="relative hidden w-1/2 lg:block bg-gradient-to-br from-purple-50 to-blue-50">
        <Image
          src="/assets/haven-welcome.png"
          alt="Haven - A warm welcome"
          fill
          className="object-contain"
          priority
        />
        {/* Overlay with brand text */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50">
          <div className="flex h-full flex-col items-center justify-center px-12">
            <h1 className="mb-4 text-6xl font-bold text-white drop-shadow-lg text-center">
              Haven
            </h1>
            <p className="text-2xl text-white drop-shadow-md text-center">
              Automate your SDA business
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full items-center justify-center bg-white px-6 lg:w-1/2 lg:px-12">
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
