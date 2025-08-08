import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { JSX } from "react";

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in-progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'pending':
      return 'bg-blue-100 text-blue-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return 'Finalizat';
    case 'in-progress':
      return 'În progres';
    case 'pending':
      return 'În așteptare';
    case 'rejected':
      return 'Respins';
    default:
      return 'Necunoscut';
  }
}

export function getStatusIcon(status: string): JSX.Element {
  const className = "h-4 w-4";
  switch (status) {
    case 'completed':
      return <CheckCircle className={className} />;
    case 'in-progress':
      return <Clock className={className} />;
    case 'pending':
      return <AlertCircle className={className} />;
    case 'rejected':
      return <XCircle className={className} />;
    default:
      return <AlertCircle className={className} />;
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
