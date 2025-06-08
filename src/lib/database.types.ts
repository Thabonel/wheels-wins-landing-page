
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: number;
          user_id: string;
          email: string;
          role: 'user' | 'admin' | 'moderator' | 'premium';
          status: 'active' | 'suspended' | 'pending';
          region: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          email: string;
          role?: 'user' | 'admin' | 'moderator' | 'premium';
          status?: 'active' | 'suspended' | 'pending';
          region?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          email?: string;
          role?: 'user' | 'admin' | 'moderator' | 'premium';
          status?: 'active' | 'suspended' | 'pending';
          region?: string;
          created_at?: string;
        };
      };
    };
  };
}
