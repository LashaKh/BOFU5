export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      approved_products: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_name: string | null
          created_at: string | null
          id: string
          product_data: Json
          product_description: string | null
          product_index: number
          product_name: string
          research_result_id: string
          reviewed_at: string | null
          reviewed_status: string | null
          reviewer_comments: string | null
          reviewer_id: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          product_data: Json
          product_description?: string | null
          product_index: number
          product_name: string
          research_result_id: string
          reviewed_at?: string | null
          reviewed_status?: string | null
          reviewer_comments?: string | null
          reviewer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          product_data?: Json
          product_description?: string | null
          product_index?: number
          product_name?: string
          research_result_id?: string
          reviewed_at?: string | null
          reviewed_status?: string | null
          reviewer_comments?: string | null
          reviewer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approved_products_research_result_id_fkey"
            columns: ["research_result_id"]
            isOneToOne: false
            referencedRelation: "research_results"
            referencedColumns: ["id"]
          },
        ]
      }
      content_briefs: {
        Row: {
          brief_content: Json
          brief_content_text: string | null
          created_at: string
          id: string
          internal_links: string | null
          possible_article_titles: string | null
          product_name: string | null
          research_result_id: string | null
          status: Database["public"]["Enums"]["brief_status"]
          suggested_content_frameworks: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brief_content?: Json
          brief_content_text?: string | null
          created_at?: string
          id?: string
          internal_links?: string | null
          possible_article_titles?: string | null
          product_name?: string | null
          research_result_id?: string | null
          status?: Database["public"]["Enums"]["brief_status"]
          suggested_content_frameworks?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brief_content?: Json
          brief_content_text?: string | null
          created_at?: string
          id?: string
          internal_links?: string | null
          possible_article_titles?: string | null
          product_name?: string | null
          research_result_id?: string | null
          status?: Database["public"]["Enums"]["brief_status"]
          suggested_content_frameworks?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_documents: {
        Row: {
          content_hash: string | null
          created_at: string | null
          document_type:
            | Database["public"]["Enums"]["document_type_enum"]
            | null
          error_message: string | null
          extracted_text: string | null
          file_name: string | null
          file_url: string | null
          id: string
          is_google_doc: boolean | null
          is_removed_from_vector_store: boolean
          openai_vsf_id: string | null
          product_id: string | null
          raw_url: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["new_document_status"] | null
          storage_path: string | null
          updated_at: string | null
          used_ai_extraction: boolean | null
          user_id: string | null
        }
        Insert: {
          content_hash?: string | null
          created_at?: string | null
          document_type?:
            | Database["public"]["Enums"]["document_type_enum"]
            | null
          error_message?: string | null
          extracted_text?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_google_doc?: boolean | null
          is_removed_from_vector_store?: boolean
          openai_vsf_id?: string | null
          product_id?: string | null
          raw_url?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["new_document_status"] | null
          storage_path?: string | null
          updated_at?: string | null
          used_ai_extraction?: boolean | null
          user_id?: string | null
        }
        Update: {
          content_hash?: string | null
          created_at?: string | null
          document_type?:
            | Database["public"]["Enums"]["document_type_enum"]
            | null
          error_message?: string | null
          extracted_text?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_google_doc?: boolean | null
          is_removed_from_vector_store?: boolean
          openai_vsf_id?: string | null
          product_id?: string | null
          raw_url?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["new_document_status"] | null
          storage_path?: string | null
          updated_at?: string | null
          used_ai_extraction?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_documents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          generated_analysis_data: Json | null
          id: string
          name: string
          openai_vector_store_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          generated_analysis_data?: Json | null
          id?: string
          name: string
          openai_vector_store_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          generated_analysis_data?: Json | null
          id?: string
          name?: string
          openai_vector_store_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      research_results: {
        Row: {
          approved_by: string | null
          created_at: string | null
          data: Json
          id: string
          is_approved: boolean | null
          is_draft: boolean | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          data: Json
          id?: string
          is_approved?: boolean | null
          is_draft?: boolean | null
          title: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          data?: Json
          id?: string
          is_approved?: boolean | null
          is_draft?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string | null
          email: string
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email: string
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      migrate_existing_users: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      brief_status: "draft" | "edited" | "approved" | "sent"
      document_type_enum:
        | "pdf"
        | "docx"
        | "doc"
        | "pptx"
        | "blog_link"
        | "txt"
        | "other"
      new_document_status: "pending" | "processing" | "completed" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      brief_status: ["draft", "edited", "approved", "sent"],
      document_type_enum: [
        "pdf",
        "docx",
        "doc",
        "pptx",
        "blog_link",
        "txt",
        "other",
      ],
      new_document_status: ["pending", "processing", "completed", "failed"],
    },
  },
} as const
