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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          details: Json
          id: string
          match_score: number
          matched_user_id: string
          scenario: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          match_score?: number
          matched_user_id: string
          scenario?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          match_score?: number
          matched_user_id?: string
          scenario?: string
          user_id?: string
        }
        Relationships: []
      }
      meet_plans: {
        Row: {
          created_at: string
          id: string
          match_id: string
          plan_content: Json
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          plan_content?: Json
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          plan_content?: Json
        }
        Relationships: [
          {
            foreignKeyName: "meet_plans_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
          wechat_openid: string | null
          wechat_unionid: string | null
          wechat_nickname: string | null
          wechat_avatar: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          updated_at?: string
          wechat_openid?: string | null
          wechat_unionid?: string | null
          wechat_nickname?: string | null
          wechat_avatar?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
          wechat_openid?: string | null
          wechat_unionid?: string | null
          wechat_nickname?: string | null
          wechat_avatar?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_authorizations: {
        Row: {
          business: boolean
          created_at: string
          dating: boolean
          id: string
          partner: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          business?: boolean
          created_at?: string
          dating?: boolean
          id?: string
          partner?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          business?: boolean
          created_at?: string
          dating?: boolean
          id?: string
          partner?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          id: string
          profile_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_data?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          status?: string
        }
        Relationships: []
      }

      ai_personas: {
        Row: {
          id: string
          name: string
          age: number | null
          city: string
          occupation: string | null
          headline: string
          bio: string
          scenario_tags: string[]
          profile_data: Json
          image_url: string | null
          is_active: boolean
          display_priority: number
          match_count: number
          last_matched_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          age?: number | null
          city: string
          occupation?: string | null
          headline: string
          bio: string
          scenario_tags?: string[]
          profile_data?: Json
          image_url?: string | null
          is_active?: boolean
          display_priority?: number
          match_count?: number
          last_matched_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          age?: number | null
          city?: string
          occupation?: string | null
          headline?: string
          bio?: string
          scenario_tags?: string[]
          profile_data?: Json
          image_url?: string | null
          is_active?: boolean
          display_priority?: number
          match_count?: number
          last_matched_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          id: string
          amap_id: string | null
          name: string
          city: string
          district: string | null
          address: string | null
          lat: number | null
          lng: number | null
          cuisine_tags: string[]
          vibe_tags: string[]
          price_per_person: number | null
          rating: number | null
          review_count: number | null
          tel: string | null
          opening_hours: string | null
          photos: string[]
          source: string
          source_url: string | null
          booking_method: string
          commission_pct: number
          is_active: boolean
          notes: string | null
          last_verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          amap_id?: string | null
          name: string
          city: string
          district?: string | null
          address?: string | null
          lat?: number | null
          lng?: number | null
          cuisine_tags?: string[]
          vibe_tags?: string[]
          price_per_person?: number | null
          rating?: number | null
          review_count?: number | null
          tel?: string | null
          opening_hours?: string | null
          photos?: string[]
          source: string
          source_url?: string | null
          booking_method?: string
          commission_pct?: number
          is_active?: boolean
          notes?: string | null
          last_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          amap_id?: string | null
          name?: string
          city?: string
          district?: string | null
          address?: string | null
          lat?: number | null
          lng?: number | null
          cuisine_tags?: string[]
          vibe_tags?: string[]
          price_per_person?: number | null
          rating?: number | null
          review_count?: number | null
          tel?: string | null
          opening_hours?: string | null
          photos?: string[]
          source?: string
          source_url?: string | null
          booking_method?: string
          commission_pct?: number
          is_active?: boolean
          notes?: string | null
          last_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      meetup_attributions: {
        Row: {
          id: string
          user_id: string
          match_id: string | null
          venue_id: string | null
          action: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          match_id?: string | null
          venue_id?: string | null
          action: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          match_id?: string | null
          venue_id?: string | null
          action?: string
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetup_attributions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetup_attributions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_confirmations: {
        Row: {
          id: string
          attribution_id: string
          user_id: string
          venue_id: string
          token: string
          expires_at: string
          email_sent_at: string | null
          confirmed_at: string | null
          denied_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          attribution_id: string
          user_id: string
          venue_id: string
          token: string
          expires_at: string
          email_sent_at?: string | null
          confirmed_at?: string | null
          denied_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          attribution_id?: string
          user_id?: string
          venue_id?: string
          token?: string
          expires_at?: string
          email_sent_at?: string | null
          confirmed_at?: string | null
          denied_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      pattern_feedback: {
        Row: {
          id: string
          user_id: string
          pattern_text: string
          section: string | null
          verdict: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          pattern_text: string
          section?: string | null
          verdict: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          pattern_text?: string
          section?: string | null
          verdict?: string
          created_at?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          id: string
          user_id: string
          kind: string
          score: number | null
          body: string | null
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          kind: string
          score?: number | null
          body?: string | null
          source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          kind?: string
          score?: number | null
          body?: string | null
          source?: string | null
          created_at?: string
        }
        Relationships: []
      }
      wechat_auth: {
        Row: {
          user_id: string
          openid: string
          unionid: string | null
          nickname: string | null
          avatar: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          openid: string
          unionid?: string | null
          nickname?: string | null
          avatar?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          openid?: string
          unionid?: string | null
          nickname?: string | null
          avatar?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          id: string
          slug: string
          locale: string
          status: string
          title: string
          excerpt: string | null
          body: string | null
          cover_image_url: string | null
          published_at: string | null
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          locale?: string
          status?: string
          title: string
          excerpt?: string | null
          body?: string | null
          cover_image_url?: string | null
          published_at?: string | null
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          locale?: string
          status?: string
          title?: string
          excerpt?: string | null
          body?: string | null
          cover_image_url?: string | null
          published_at?: string | null
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

    }
    Views: {
      v_user_visit_summary: {
        Row: {
          user_id: string | null
          venue_id: string | null
          year_month: string | null
          viewed_modal: boolean | null
          tapped_call: boolean | null
          tapped_navigate: boolean | null
          claimed_i_went: boolean | null
          valid_visit: boolean | null
          view_count: number | null
          call_count: number | null
          navigate_count: number | null
          claim_count: number | null
          first_seen_at: string | null
          last_seen_at: string | null
        }
        Relationships: []
      }
      v_venue_monthly_reconciliation: {
        Row: {
          venue_id: string | null
          venue_name: string | null
          city: string | null
          district: string | null
          commission_pct: number | null
          booking_method: string | null
          venue_is_active: boolean | null
          year_month: string | null
          unique_users: number | null
          total_views: number | null
          total_call_taps: number | null
          total_navigate_taps: number | null
          total_claims: number | null
          total_valid_visits: number | null
          estimated_rebate_cny: number | null
        }
        Relationships: []
      }
      v_user_journey_funnel: {
        Row: {
          user_id: string | null
          match_id: string | null
          scenario: string | null
          viewed_modal: boolean | null
          took_booking_action: boolean | null
          claimed_i_went: boolean | null
          valid_visit: boolean | null
          funnel_top_at: string | null
          funnel_last_at: string | null
        }
        Relationships: []
      }
      v_pending_confirmations: {
        Row: {
          attribution_id: string | null
          user_id: string | null
          venue_id: string | null
          venue_name: string | null
          confirmed_at: string | null
          hours_since_confirm: number | null
          confirmation_status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }

      get_funnel_summary: {
        Args: { since_days?: number }
        Returns: {
          scope: string
          total_users: number
          total_matches: number
          total_plan_views: number
          total_booking_taps: number
          total_claims: number
          total_valid_visits: number
        }[]
      }

    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
