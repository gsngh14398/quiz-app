import { useState } from "react";
import { useGetAllRedeemRequests, useUpdateRedeemStatus, GetAllRedeemRequestsStatus, UpdateRedeemStatusRequestStatus } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function Redeems() {
  const { headers } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [statusFilter, setStatusFilter] = useState<GetAllRedeemRequestsStatus | "">("");
  
  const { data: requests = [], isLoading } = useGetAllRedeemRequests(
    statusFilter ? { status: statusFilter } : undefined,
    { request: { headers } }
  );
  
  const updateStatusMut = useUpdateRedeemStatus({ request: { headers } });

  const [isOpen, setIsOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [actionType, setActionType] = useState<"approved" | "rejected" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const handleActionClick = (req: any, type: "approved" | "rejected") => {
    setSelectedReq(req);
    setActionType(type);
    setAdminNotes("");
    setIsOpen(true);
  };

  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !actionType) return;
    
    updateStatusMut.mutate(
      { 
        id: selectedReq.id, 
        data: { 
          status: actionType as UpdateRedeemStatusRequestStatus, 
          adminNotes 
        } 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/redeem"] });
          toast({ title: `Request ${actionType}`, description: "Status updated successfully." });
          setIsOpen(false);
        }
      }
    );
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader title="Redeem Requests" description="Review and process user point redemptions" />

      <div className="flex gap-4 items-center bg-card/50 p-4 rounded-xl border border-border/50">
        <span className="text-sm font-medium text-muted-foreground">Status Filter:</span>
        <select 
          className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Reward Info</TableHead>
              <TableHead>Points Cost</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : requests.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No requests found.</TableCell></TableRow>
            ) : (
              requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{r.user?.name || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">{r.user?.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium uppercase text-xs tracking-wider mb-1 text-primary">{r.rewardType}</div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {Object.entries(r.rewardDetails || {}).map(([k, v]) => (
                        <div key={k} className="flex gap-1"><span className="opacity-70">{k}:</span> <span className="font-mono text-foreground">{v as string}</span></div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-yellow-500">{r.points}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(r.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold uppercase
                      ${r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 
                        r.status === 'approved' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                      {r.status}
                    </span>
                    {r.adminNotes && <div className="text-[10px] mt-1 text-muted-foreground max-w-[150px] truncate" title={r.adminNotes}>Note: {r.adminNotes}</div>}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="border-green-500/50 text-green-500 hover:bg-green-500/10" onClick={() => handleActionClick(r, "approved")}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500/10" onClick={() => handleActionClick(r, "rejected")}>
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className={actionType === 'approved' ? 'text-green-500' : 'text-red-500'}>
              {actionType === 'approved' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionType} this request for {selectedReq?.points} points?
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmAction} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Notes (Optional)</label>
              <textarea 
                value={adminNotes} 
                onChange={e => setAdminNotes(e.target.value)} 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={actionType === 'rejected' ? "Reason for rejection..." : "Transaction ID, remarks..."}
              />
            </div>
            <Button 
              type="submit" 
              className={`w-full ${actionType === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
              disabled={updateStatusMut.isPending}
            >
              {updateStatusMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm {actionType}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
