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

export function getStatusIcon(status: string): string {
  switch (status) {
    case 'completed':
      return '✅';
    case 'in-progress':
      return '🔄';
    case 'pending':
      return '⏳';
    case 'rejected':
      return '❌';
    default:
      return '❓';
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

export function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'high':
      return 'Prioritate Mare';
    case 'medium':
      return 'Prioritate Medie';
    case 'low':
      return 'Prioritate Mică';
    default:
      return 'Necunoscut';
  }
}
