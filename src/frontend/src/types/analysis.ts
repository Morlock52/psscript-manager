// Type definitions for script analysis data

export interface AnalysisParameter {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  defaultValue?: string;
}

export interface ScriptAnalysis {
  id: string;
  script_id: string;
  purpose?: string;
  parameters?: AnalysisParameter[];
  code_quality_score?: number;
  security_score?: number;
  risk_score?: number;
  complexity_score?: number;
  optimization_suggestions?: string[];
  security_concerns?: string[];
  best_practices?: string[];
  performance_suggestions?: string[];
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
}