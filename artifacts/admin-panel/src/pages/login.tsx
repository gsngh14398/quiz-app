import { useState } from "react";
import { useAdminLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = useAdminLogin();
  const { setToken } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          setToken(data.token);
          toast({ title: "Welcome back", description: "Successfully logged in." });
          navigate("/");
        },
        onError: () => {
          toast({ variant: "destructive", title: "Login Failed", description: "Invalid credentials" });
        }
      }
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background bg-grid-pattern relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-background to-background z-0" />
      
      <div className="w-full max-w-md p-8 bg-card/80 backdrop-blur-2xl border border-border/50 rounded-3xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary/20 border border-primary/30 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white text-center">Quiz Elite Admin</h1>
          <p className="text-muted-foreground mt-2 text-center">Sign in to manage the platform</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="admin@quizelite.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background/50 h-12 rounded-xl"
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background/50 h-12 rounded-xl"
              required 
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl text-md font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
