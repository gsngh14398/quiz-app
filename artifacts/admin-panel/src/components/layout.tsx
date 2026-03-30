import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { 
  LayoutDashboard, 
  FolderTree, 
  Layers, 
  BookOpen, 
  HelpCircle, 
  Users, 
  Gift, 
  Trophy, 
  FileText,
  LogOut,
  BellRing,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/subcategories", label: "Subcategories", icon: Layers },
  { href: "/quizzes", label: "Quizzes", icon: BookOpen },
  { href: "/question-bank", label: "Question Bank", icon: Database },
  { href: "/questions", label: "Questions", icon: HelpCircle },
  { href: "/users", label: "Users", icon: Users },
  { href: "/redeems", label: "Redeem Requests", icon: BellRing },
  { href: "/rewards", label: "Rewards", icon: Gift },
  { href: "/notes", label: "Study Notes", icon: FileText },
  { href: "/competitions", label: "Competitions", icon: Trophy },
];

export function Layout({ children }: { children: ReactNode }) {
  const { token, logout } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!token && location !== "/login") {
      navigate("/login");
    }
  }, [token, location, navigate]);

  if (!token) return null;

  return (
    <div className="flex h-screen w-full bg-background bg-grid-pattern text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-card/50 backdrop-blur-xl flex flex-col relative z-10 shadow-2xl shadow-black/50">
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <h1 className="font-display font-bold text-lg tracking-wide text-white">Quiz Elite</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="text-xs font-semibold text-muted-foreground mb-4 px-2 uppercase tracking-wider">
            Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? "bg-primary/10 text-primary font-medium border border-primary/20 shadow-sm shadow-primary/5" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"}
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "group-hover:text-foreground"}`} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-border/50">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative z-0 overflow-y-auto overflow-x-hidden">
        <div className="p-8 pb-24 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

export function PageHeader({ title, description, children }: { title: string, description?: string, children?: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-white">{title}</h2>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
