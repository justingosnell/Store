import { useState } from "react";
import { Baby, LogIn, User, LogOut, KeyRound, Store } from "lucide-react";
import { LoginModal } from "./LoginModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getApiUrl } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export function AppHeader() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch site settings for logo
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/settings"));
      if (!response.ok) return {};
      return response.json();
    },
  });

  const logoUrl = settings?.site_logo;

  const handleLogout = async () => {
    await logout();
  };

  const handleGoToAdmin = () => {
    setLocation("/admin");
  };

  const handleChangePassword = () => {
    setIsLoginModalOpen(true);
  };

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-pink-100 bg-white/95 text-gray-800 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex-1"></div>
          
          <button 
            onClick={handleGoHome}
            className="group flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 transition-opacity duration-200 hover:opacity-90"
            aria-label="Go to home page"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Tiny Treasures logo"
                className="h-12 w-12 object-contain"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-400 shadow-md transition-transform group-hover:scale-105">
                <Baby className="h-5 w-5 text-white" />
              </span>
            )}
            <span className="flex flex-col text-left leading-tight" data-testid="text-app-title">
              <span className="text-lg font-bold tracking-tight text-pink-600">Tiny Treasures</span>
              <span className="-mt-1 text-[10px] font-medium uppercase tracking-widest text-purple-400">Baby Boutique</span>
            </span>
          </button>

          <div className="flex-1 flex items-center justify-end gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-user-menu">
                    <User className="h-4 w-4 mr-2" />
                    {user.username}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleGoToAdmin}>
                    <Store className="h-4 w-4 mr-2" />
                    Admin Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleChangePassword}>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Change Password
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLoginModalOpen(true)}
                data-testid="button-login"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      <LoginModal open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen} />
    </>
  );
}
