import { Search, Bell, Sun, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppDispatch, useAppSelector, appActions } from "@/store";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";

export function Topbar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { demoMode, role } = useAppSelector(s => s.app);
  const unread = useAppSelector(s => s.alerts.items.filter(a => !a.read).length);
  const { theme, toggle } = useTheme();

  return (
    <header className="h-16 sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border flex items-center px-6 gap-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search SKU or product…" className="pl-9 bg-secondary/60 border-border h-9" />
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/60 border border-border">
        <Switch id="demo" checked={demoMode} onCheckedChange={() => dispatch(appActions.toggleDemo())} />
        <Label htmlFor="demo" className="text-xs cursor-pointer">
          Demo Mode <span className={demoMode ? "text-primary" : "text-muted-foreground"}>{demoMode ? "ON" : "OFF"}</span>
        </Label>
      </div>

      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" className="transition-transform hover:rotate-12">
        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </Button>

      <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/alerts")}>
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-destructive text-destructive-foreground border-0">
            {unread}
          </Badge>
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">RM</AvatarFallback>
            </Avatar>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-medium leading-none">Ravi Mehta</div>
              <div className="text-[10px] text-muted-foreground mt-1">{role}</div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Switch role (demo)</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={role} onValueChange={(v) => dispatch(appActions.setRole(v as any))}>
            <DropdownMenuRadioItem value="Admin">Admin</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="Manager">Manager</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="Viewer">Viewer (read-only)</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/settings")}>Settings</DropdownMenuItem>
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
