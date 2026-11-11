export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_approvals: {
        Row: {
          created_at: string
          decided_at: string | null
          email: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          email?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          email?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      checklists: {
        Row: {
          attachments: string[]
          checked_at: string | null
          checked_date: string | null
          checked_time: string | null
          created_at: string
          created_by: string | null
          employee: string | null
          id: string
          items: Json
          km: number | null
          manager_id: string | null
          manager_name: string | null
          model: string | null
          next_belt_km: number | null
          next_oil_km: number | null
          notes: string | null
          obra: string | null
          plate: string
          raw_text: string | null
          responsible: string | null
        }
        Insert: {
          attachments?: string[]
          checked_at?: string | null
          checked_date?: string | null
          checked_time?: string | null
          created_at?: string
          created_by?: string | null
          employee?: string | null
          id?: string
          items?: Json
          km?: number | null
          manager_id?: string | null
          manager_name?: string | null
          model?: string | null
          next_belt_km?: number | null
          next_oil_km?: number | null
          notes?: string | null
          obra?: string | null
          plate: string
          raw_text?: string | null
          responsible?: string | null
        }
        Update: {
          attachments?: string[]
          checked_at?: string | null
          checked_date?: string | null
          checked_time?: string | null
          created_at?: string
          created_by?: string | null
          employee?: string | null
          id?: string
          items?: Json
          km?: number | null
          manager_id?: string | null
          manager_name?: string | null
          model?: string | null
          next_belt_km?: number | null
          next_oil_km?: number | null
          notes?: string | null
          obra?: string | null
          plate?: string
          raw_text?: string | null
          responsible?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          expense_date: string | null
          ext_id: number | null
          id: string
          plate: string
          provider: string | null
          status: string | null
          tipo: string | null
          vehicle_name: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          expense_date?: string | null
          ext_id?: number | null
          id?: string
          plate: string
          provider?: string | null
          status?: string | null
          tipo?: string | null
          vehicle_name?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          expense_date?: string | null
          ext_id?: number | null
          id?: string
          plate?: string
          provider?: string | null
          status?: string | null
          tipo?: string | null
          vehicle_name?: string | null
        }
        Relationships: []
      }
      managers: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_assignments: {
        Row: {
          checklist_id: string | null
          created_at: string
          employee: string | null
          id: string
          manager_id: string | null
          plate: string
          start_date: string | null
        }
        Insert: {
          checklist_id?: string | null
          created_at?: string
          employee?: string | null
          id?: string
          manager_id?: string | null
          plate: string
          start_date?: string | null
        }
        Update: {
          checklist_id?: string | null
          created_at?: string
          employee?: string | null
          id?: string
          manager_id?: string | null
          plate?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_assignments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          efetivos: number
          encarregado: string | null
          id: string
          km: number | null
          linked_plates: string | null
          local: string | null
          manager_id: string | null
          mechanic_changed_at: string | null
          mechanic_manual: string | null
          mechanic_shop: string | null
          model: string
          motorista: string | null
          obra: string | null
          observacao: string | null
          plate: string
          projeto: string | null
          status: string
        }
        Insert: {
          created_at?: string
          efetivos?: number
          encarregado?: string | null
          id?: string
          km?: number | null
          linked_plates?: string | null
          local?: string | null
          manager_id?: string | null
          mechanic_changed_at?: string | null
          mechanic_manual?: string | null
          mechanic_shop?: string | null
          model?: string
          motorista?: string | null
          obra?: string | null
          observacao?: string | null
          plate: string
          projeto?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          efetivos?: number
          encarregado?: string | null
          id?: string
          km?: number | null
          linked_plates?: string | null
          local?: string | null
          manager_id?: string | null
          mechanic_changed_at?: string | null
          mechanic_manual?: string | null
          mechanic_shop?: string | null
          model?: string
          motorista?: string | null
          obra?: string | null
          observacao?: string | null
          plate?: string
          projeto?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
