export interface CRMContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface CRMTicket {
  id: string;
  contactId: string;
  type: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
}

export interface CRMAppointment {
  id: string;
  contactId: string;
  date: string;
  time: string;
  purpose: string;
  createdAt: string;
}

export type DemoMode = "demo" | "live";

export interface DemoEvent {
  type: "contact" | "ticket" | "appointment";
  delay: number; // ms from demo start
  data: CRMContact | CRMTicket | CRMAppointment;
}

export interface ContactFormData {
  name: string;
  email: string;
  company: string;
  service: string;
  message: string;
}
