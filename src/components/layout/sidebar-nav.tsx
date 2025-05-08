"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Link2,
  Wallet,
  Settings,
  LogOut,
  UserCircle,
  Bell,
  Scale,
  ChevronDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMockAuth } from "@/hooks/use-mock-auth";
import { MOCK_USER } from "@/data/mock-data";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contracts", label: "Contracts", icon: FileText },
  { href: "/integrations", label: "Integrations", icon: Link2 },
  { href: "/wallet", label: "Creator Wallet", icon: Wallet },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user, logout } = useMockAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const activeUser = user || MOCK_USER; // Fallback to MOCK_USER if context.user is null

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Scale className="h-7 w-7 text-primary group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8" />
          <h1 className="text-xl font-semibold group-data-[collapsible=icon]:hidden">SoloLedger</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  className={cn(
                    pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                  tooltip={{ children: item.label, className: "group-data-[collapsible=icon]:block hidden"}}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
         <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2 h-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-auto">
              <Avatar className="h-9 w-9 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                <AvatarImage src={activeUser.avatarUrl} alt={activeUser.name} data-ai-hint="user avatar" />
                <AvatarFallback>{activeUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="ml-3 text-left group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium">{activeUser.name}</p>
                <p className="text-xs text-muted-foreground">{activeUser.email}</p>
              </div>
              <ChevronDown className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 mb-2 ml-2">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserCircle className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
