export interface Equipment {
  id: string;
  name: string;
  status: 'ready' | 'pending' | 'loading' | 'delivered' | string;
  accessories?: Equipment[];
  department_id: string;
  parent_id?: string | null;
  quantity?: number;
  show_in_checklist?: boolean;
  created_at?: string;
  updated_at?: string;
  // ProjectEquipment fields for coordination display
  custom_description?: string | null;
  custom_name?: string | null;
  is_custom?: boolean;
  project_files?: ProjectFile[];
}

export interface ProjectEquipment {
  id: string;
  project_id: string;
  department_id: string;
  equipment_id: string | null;
  custom_name: string | null;
  custom_description: string | null;
  quantity: number;
  status: string;
  is_custom: boolean;
  intermediate_warehouse_id?: string | null;
  project_parent_id?: string | null;
  equipment?: Equipment;
  project_files?: ProjectFile[];
}

export interface ProjectFile {
  id: string;
  project_id: string;
  project_equipment_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_data: string; // Base64 encoded binary data
  mime_type: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  equipment: Equipment[];
}

export interface Transport {
  id: string;
  equipment: Equipment[];
  capacity: number;
}

export interface Destination {
  id: string;
  name: string;
  equipment: Equipment[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'pending';
  startDate: string;
  endDate?: string;
  location: string;
  reverse_flow?: boolean;
}