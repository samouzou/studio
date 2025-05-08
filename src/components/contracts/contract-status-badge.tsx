import { Badge } from "@/components/ui/badge";
import type { Contract } from "@/types";

interface ContractStatusBadgeProps {
  status: Contract['status'];
}

export function ContractStatusBadge({ status }: ContractStatusBadgeProps) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let text = status.charAt(0).toUpperCase() + status.slice(1);

  switch (status) {
    case 'pending':
      variant = 'outline';
      text = 'Pending';
      break;
    case 'paid':
      variant = 'default'; // Using primary color for "paid"
      // Custom style for "paid" to be green-ish
      return <Badge className="bg-green-500 hover:bg-green-600 text-white capitalize">{text}</Badge>;
    case 'overdue':
      variant = 'destructive';
      text = 'Overdue';
      break;
    case 'at_risk':
      variant = 'destructive';
      text = 'At Risk';
      break;
    case 'invoiced':
      variant = 'secondary';
      text = 'Invoiced';
      break;
    default:
      variant = 'outline';
  }

  return <Badge variant={variant} className="capitalize">{text.replace('_', ' ')}</Badge>;
}
