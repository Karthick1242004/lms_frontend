"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { FcGoogle } from "react-icons/fc"
import Image from "next/image"
import { useMutation } from "@tanstack/react-query"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import bg from '@/public/5707839.jpg'

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
})

const signupSchema = loginSchema
  .extend({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type LoginFormValues = z.infer<typeof loginSchema>
type SignupFormValues = z.infer<typeof signupSchema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [signupError, setSignupError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormValues) => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error)
      }
      
      return result
    },
  })

  async function onLoginSubmit(data: LoginFormValues) {
    setIsLoading(true)
    setLoginError(null)

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        let errorMessage = "Invalid email or password"
        
        // Handle specific error messages if returned from the API
        if (result.error === "No user found with this email") {
          errorMessage = "No account found with this email"
        } else if (result.error === "Invalid password") {
          errorMessage = "The password you entered is incorrect"
        }
        
        setLoginError(errorMessage)
      } else {
        router.push("/dashboard")
      }
    } catch (error) {
      setLoginError("Something went wrong with the login process. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  async function onSignupSubmit(data: SignupFormValues) {
    setIsLoading(true)
    setSignupError(null)
    setSignupSuccess(null)

    try {
      await signupMutation.mutateAsync(data)
      
      setSignupSuccess("Your account has been created successfully. You can now log in.")

      signupForm.reset()

      document.getElementById("login-tab")?.click()

      loginForm.setValue("email", data.email)
      loginForm.setValue("password", "")

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong"
      
      if (errorMessage.includes("already exists") || errorMessage === "User already exists") {
        setSignupError("This email is already registered. Please try logging in instead.")
        
        document.getElementById("login-tab")?.click()
        loginForm.setValue("email", data.email)
      } else if (errorMessage.includes("password")) {
        setSignupError(errorMessage)
      } else if (errorMessage.includes("email")) {
        setSignupError(errorMessage)
      } else {
        setSignupError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    try {
      setIsLoading(true)
      setGoogleError(null)
      await signIn("google", { 
        callbackUrl: "/dashboard",
        redirect: true,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed"
      setGoogleError(errorMessage)
      setIsLoading(false)
    }
  }

  // Helper function to render error messages
  const ErrorMessage = ({ message }: { message: string | null }) => {
    if (!message) return null;
    return (
      <div className="bg-destructive/15 p-3 rounded-md flex items-start mt-2 mb-4">
        <AlertCircle className="h-4 w-4 text-destructive mr-2 mt-0.5" />
        <p className="text-sm text-destructive">{message}</p>
      </div>
    );
  };

  // Helper function to render success messages
  const SuccessMessage = ({ message }: { message: string | null }) => {
    if (!message) return null;
    return (
      <div className="bg-green-100 p-3 rounded-md flex items-start mt-2 mb-4">
        <CheckCircle2 className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
        <p className="text-sm text-green-600">{message}</p>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 relative bg-purple-900">
        <div className="absolute inset-0">
          <Image
            src={bg}
            alt="Purple mountain landscape"
            className="object-cover w-full h-full"
            width={10}
            height={10}
          />
          <div className="absolute inset-0 bg-purple-900/40" /> {/* Overlay */}
        </div>
        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          <div className="text-white text-3xl flex flex-row items-center gap-3 font-bold">
          <img src='https://folio-lynkr-main.vercel.app/_next/image?url=%2FFolio%20black%20circle.png&w=96&q=75' alt="Logo" className="h-14 w-14"></img>Quantum Path
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white">
            Learn as if you were to ,
              <br />
              Live forever
            </h1>
            <div className="flex space-x-2">
              <div className="w-8 h-2 rounded-full bg-white/30" />
              <div className="w-8 h-2 rounded-full bg-white/30" />
              <div className="w-8 h-2 rounded-full bg-white" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-muted/40">
        <div className="w-full max-w-md">
          <Card className="w-full">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Quantum Path</CardTitle>
              <CardDescription className="text-center">
                Sign in to access your courses and learning materials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
                  <FcGoogle className="mr-2 h-4 w-4" />
                  Sign in with Google
                </Button>
                
                {googleError && <ErrorMessage message={googleError} />}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login" id="login-tab">
                      Login
                    </TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    {loginError && <ErrorMessage message={loginError} />}
                    {signupSuccess && <SuccessMessage message={signupSuccess} />}
                    
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="m@example.com" {...loginForm.register("email")} />
                        {loginForm.formState.errors.email && (
                          <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Password</Label>
                          <Button variant="link" className="px-0 text-xs">
                            Forgot password?
                          </Button>
                        </div>
                        <Input id="password" type="password" {...loginForm.register("password")} />
                        {loginForm.formState.errors.password && (
                          <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                        )}
                      </div>

                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    {signupError && <ErrorMessage message={signupError} />}
                    
                    <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" placeholder="John Doe" {...signupForm.register("name")} />
                        {signupForm.formState.errors.name && (
                          <p className="text-sm text-destructive">{signupForm.formState.errors.name.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="m@example.com"
                          {...signupForm.register("email")}
                        />
                        {signupForm.formState.errors.email && (
                          <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input id="signup-password" type="password" {...signupForm.register("password")} />
                        {signupForm.formState.errors.password && (
                          <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input id="confirm-password" type="password" {...signupForm.register("confirmPassword")} />
                        {signupForm.formState.errors.confirmPassword && (
                          <p className="text-sm text-destructive">
                            {signupForm.formState.errors.confirmPassword.message}
                          </p>
                        )}
                      </div>

                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <div className="text-center text-sm text-muted-foreground">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

