import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Categories from "@/pages/categories";
import Subcategories from "@/pages/subcategories";
import Quizzes from "@/pages/quizzes";
import Questions from "@/pages/questions";
import Users from "@/pages/users";
import Redeems from "@/pages/redeems";
import Rewards from "@/pages/rewards";
import Notes from "@/pages/notes";
import Competitions from "@/pages/competitions";
import QuestionBank from "@/pages/question-bank";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ path, component: Component }: { path: string, component: React.ComponentType }) {
  return (
    <Route path={path}>
      <Layout>
        <Component />
      </Layout>
    </Route>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/categories" component={Categories} />
      <ProtectedRoute path="/subcategories" component={Subcategories} />
      <ProtectedRoute path="/quizzes" component={Quizzes} />
      <ProtectedRoute path="/questions" component={Questions} />
      <ProtectedRoute path="/users" component={Users} />
      <ProtectedRoute path="/redeems" component={Redeems} />
      <ProtectedRoute path="/rewards" component={Rewards} />
      <ProtectedRoute path="/notes" component={Notes} />
      <ProtectedRoute path="/competitions" component={Competitions} />
      <ProtectedRoute path="/question-bank" component={QuestionBank} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Ensure dark mode class is applied to body for the Shadcn defaults
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('dark');
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
