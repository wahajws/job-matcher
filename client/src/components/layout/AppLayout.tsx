import { useLocation, Link } from 'wouter';
import { useAuthStore } from '@/store/auth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  FileText,
  Upload,
  Briefcase,
  Settings,
  User,
  LogOut,
  Moon,
  Sun,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

const adminMenuItems = [
  { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'CVs', url: '/admin/cvs', icon: FileText },
  { title: 'Upload CVs', url: '/admin/cvs/upload', icon: Upload },
  { title: 'Jobs', url: '/admin/jobs', icon: Briefcase },
  { title: 'Bulk Operations', url: '/admin/bulk-operations', icon: RefreshCw },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

const candidateMenuItems = [
  { title: 'Dashboard', url: '/candidate/dashboard', icon: LayoutDashboard },
  { title: 'Jobs', url: '/candidate/jobs', icon: Briefcase },
  { title: 'Profile', url: '/candidate/profile', icon: User },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logout, theme, toggleTheme, switchRole } = useAuthStore();

  const menuItems = user?.role === 'admin' ? adminMenuItems : candidateMenuItems;
  const isAdmin = user?.role === 'admin';

  const sidebarStyle = {
    '--sidebar-width': '16rem',
    '--sidebar-width-icon': '3rem',
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar className="border-r border-sidebar-border">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <Link href={isAdmin ? '/admin/dashboard' : '/candidate/dashboard'}>
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary text-primary-foreground">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-sidebar-foreground">CV Matcher</span>
                  <span className="text-xs text-muted-foreground">Powered by AI</span>
                </div>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2">
                {isAdmin ? 'Admin Panel' : 'Candidate Portal'}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => {
                    const isActive = location === item.url || location.startsWith(item.url + '/');
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className="w-full"
                        >
                          <Link href={item.url}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-3 p-2 rounded-md bg-sidebar-accent/50">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => switchRole(isAdmin ? 'candidate' : 'admin')}
                className="text-xs gap-1.5"
                data-testid="button-switch-role"
              >
                <User className="w-3.5 h-3.5" />
                Switch to {isAdmin ? 'Candidate' : 'Admin'}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                data-testid="button-toggle-theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6 custom-scrollbar">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
