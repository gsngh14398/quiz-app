import { useState } from "react";
import { useGetUsers, useUpdateUserStatus } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Coins } from "lucide-react";
import { format } from "date-fns";

export default function Users() {
  const { headers } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data: response, isLoading } = useGetUsers({ limit, offset: page * limit }, { request: { headers } });
  const users = response?.users || [];
  
  const updateStatusMut = useUpdateUserStatus({ request: { headers } });

  const toggleStatus = (id: string, current: boolean) => {
    updateStatusMut.mutate(
      { id, data: { isActive: !current } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users"] }) }
    );
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader title="Users" description="Manage player accounts and access" />

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Active Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found.</TableCell></TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold border border-border">
                        {u.name.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-foreground">{u.name}</div>
                        {u.referralCode && <div className="text-[10px] text-muted-foreground font-mono">Ref: {u.referralCode}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 font-bold text-yellow-500">
                      <Coins className="w-4 h-4" /> {u.points}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(u.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.lastLogin ? format(new Date(u.lastLogin), "MMM d, yyyy") : 'Never'}</TableCell>
                  <TableCell className="text-right">
                    <Switch checked={u.isActive} onCheckedChange={() => toggleStatus(u.id, u.isActive)} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        <div className="p-4 border-t border-border/50 flex justify-between items-center bg-muted/20">
          <span className="text-sm text-muted-foreground">Total: {response?.total || 0}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p=>p-1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={(page+1)*limit >= (response?.total || 0)} onClick={() => setPage(p=>p+1)}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
