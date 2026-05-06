import { PageHeader } from "@/components/common/PageHeader";
import { useAppDispatch, useAppSelector, appActions, inventoryActions } from "@/store";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function Settings() {
  const dispatch = useAppDispatch();
  const { demoMode, role } = useAppSelector(s => s.app);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Settings" subtitle="Configure your workspace and roles" />

      <div className="glow-card p-6 space-y-5">
        <h2 className="text-lg font-semibold">Workspace</h2>
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/40 border border-border">
          <div>
            <Label className="text-sm font-medium">Demo Mode</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Preloads sample retail data (milk, maggi, cold drink) for demos.</p>
          </div>
          <Switch checked={demoMode} onCheckedChange={() => dispatch(appActions.toggleDemo())} />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/40 border border-border">
          <div>
            <Label className="text-sm font-medium">User Role</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Viewer can only read. Admin can do everything.</p>
          </div>
          <Select value={role} onValueChange={(v) => dispatch(appActions.setRole(v as any))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Manager">Manager</SelectItem>
              <SelectItem value="Viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glow-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Data</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { dispatch(inventoryActions.reset()); toast.success("Sample data restored"); }}>
            Reset to demo data
          </Button>
          <Button variant="outline" onClick={() => { dispatch(inventoryActions.clearAll()); toast.success("Inventory cleared"); }}>
            Clear inventory
          </Button>
        </div>
      </div>

      <div className="glow-card p-6">
        <h2 className="text-lg font-semibold mb-2">About</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          RetailMind AI helps small grocery stores and pharmacies forecast demand, manage stock, and procure smartly.
          All supplier data uses APIs and cached sources — never scraping.
        </p>
      </div>
    </div>
  );
}
