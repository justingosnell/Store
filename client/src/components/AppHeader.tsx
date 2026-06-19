import { useState } from "react";
import { MapIcon, LogIn, User, LogOut, KeyRound } from "lucide-react";
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
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex-1"></div>
          
          <button 
            onClick={handleGoHome}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity duration-200 bg-transparent border-none p-0"
            aria-label="Go to home page"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Site logo"
                className="h-[75px] w-[75px] object-contain"
              />
            ) : (
              <MapIcon className="h-6 w-6 text-primary" />
            )}
            <h1 className="luckiest-guy-regular text-2xl text-foreground" data-testid="text-app-title">
              Joes Adventures
            </h1>
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
                    <MapIcon className="h-4 w-4 mr-2" />
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
