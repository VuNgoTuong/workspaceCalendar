export const COLORS = {
  primary: {
    main: '#00529C',   
    hover: '#0066c7',   
    light: '#eff6ff',    
    darkActive: 'rgba(0, 84, 165, 0.15)',
  },

  // Status Colors
  status: {
    success: {
      main: '#10b981',   
      light: '#ecfdf5', 
      dark: '#064e3b',   
    },
    warning: {
      main: '#f59e0b',    
      light: '#fef3c7',  
      dark: '#78350f',   
    },
    error: {
      main: '#ef4444',   
      light: '#fef2f2',   
      dark: '#7f1d1d',    
    },
    info: {
      main: '#3b82f6',    
      light: '#eff6ff',  
      dark: '#1e3a8a',    
    },
  },

  // Neutral Colors (Light & Dark Theme Specific)
  theme: {
    light: {
      bg: '#ffffff',
      bgLayout: '#f8fafc', 
      border: '#e2e8f0',   
      textMain: '#1e293b', 
      textMuted: '#64748b', 
      textInactive: '#475569', 
      iconInactive: '#64748b', 
    },
    dark: {
      bg: '#0f172a',       
      bgLayout: '#020617', 
      border: '#1e293b',   
      textMain: '#f8fafc', 
      textMuted: '#94a3b8', 
      textInactive: '#cbd5e1', 
      iconInactive: '#94a3b8', 
    },
  },

  // Category specific colors 
  category: {
    DEVELOPMENT: '#3b82f6', 
    OPERATIONS: '#10b981',  
    MARKETING: '#ec4899',  
    SECURITY: '#ef4444',   
  },

  // Priority specific colors
  priority: {
    LOW: '#64748b',     
    MEDIUM: '#3b82f6',  
    HIGH: '#f59e0b',    
    URGENT: '#ef4444', 
  },

  // Status specific colors 
  taskStatus: {
    PENDING: '#f59e0b',   
    ACTIVE: '#3b82f6',   
    COMPLETED: '#10b981', 
    SUSPENDED: '#94a3b8', 
  }
} as const;

export type ColorType = typeof COLORS;
