export type SubscriptionTier = 'Starter' | 'Professional' | 'Enterprise';
export type ClientStatus = 'Onboarding' | 'Active' | 'Paused' | 'Completed';

export interface ActiveServices {
  finance: boolean;
  marketing: boolean;
  processes: boolean;
  ai: boolean;
}

export interface KeyContact {
  name: string;
  title: string;
  email: string;
  phone: string;
}

// Matches NousEstrategia.Domain.DTOs.Clients.ClientDto. Note there is no phone/website/keyContact
// here — CreateClientRequest accepts them, but the backend does not currently project them back.
export interface Client {
  id: string;
  companyName: string;
  industry: string;
  country: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  status: ClientStatus;
  activeServices: ActiveServices;
  projectCount: number;
  assignedConsultantIds: string[];
}

// Used for both POST /api/clients and PUT /api/clients/{id} — the backend has no separate
// update DTO, so a full CreateClientRequest is required for an edit too.
export interface CreateClientRequest {
  companyName: string;
  industry: string;
  country: string;
  email: string;
  phone: string;
  website?: string;
  subscriptionTier: SubscriptionTier;
  activeServices?: ActiveServices;
  keyContact?: KeyContact;
}

export interface AssignConsultantsRequest {
  consultantIds: string[];
}

export interface ClientListFilters {
  page: number;
  limit: number;
}
