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
  graphql: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      block_registry_entries: {
        Row: {
          block_type: string
          compatible_business_families: Json
          created_at: string
          description: string
          is_active: boolean
          label: string
          layer: string
          required_capabilities: Json
          updated_at: string
        }
        Insert: {
          block_type: string
          compatible_business_families?: Json
          created_at?: string
          description?: string
          is_active?: boolean
          label: string
          layer?: string
          required_capabilities?: Json
          updated_at?: string
        }
        Update: {
          block_type?: string
          compatible_business_families?: Json
          created_at?: string
          description?: string
          is_active?: boolean
          label?: string
          layer?: string
          required_capabilities?: Json
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          store_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          store_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          size: string
          store_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          size: string
          store_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          size?: string
          store_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_features: {
        Row: {
          category: string
          created_at: string
          default_visible: boolean
          description: string
          is_active: boolean
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          default_visible?: boolean
          description: string
          is_active?: boolean
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          default_visible?: boolean
          description?: string
          is_active?: boolean
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_marketplace_template_installs: {
        Row: {
          created_at: string
          id: string
          installed_by: string | null
          store_id: string | null
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          installed_by?: string | null
          store_id?: string | null
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          installed_by?: string | null
          store_id?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_marketplace_template_installs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_marketplace_template_installs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "cms_marketplace_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_marketplace_template_reviews: {
        Row: {
          created_at: string
          id: string
          rating: number
          review_text: string | null
          reviewer_id: string | null
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          reviewer_id?: string | null
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          reviewer_id?: string | null
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_marketplace_template_reviews_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "cms_marketplace_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_marketplace_templates: {
        Row: {
          aesthetic: string | null
          best_for: string[]
          bundle_json: Json
          category: string
          cover_image: string | null
          created_at: string
          creator_id: string | null
          description: string | null
          id: string
          install_count: number
          mobile_ready: boolean
          preview_asset_urls: string[]
          price: number
          pricing_mode: string
          rating_avg: number | null
          rating_count: number
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          safety_findings: Json
          safety_status: string
          status: string
          submitted_at: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          aesthetic?: string | null
          best_for?: string[]
          bundle_json: Json
          category?: string
          cover_image?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          id?: string
          install_count?: number
          mobile_ready?: boolean
          preview_asset_urls?: string[]
          price?: number
          pricing_mode?: string
          rating_avg?: number | null
          rating_count?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          safety_findings?: Json
          safety_status?: string
          status?: string
          submitted_at?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          aesthetic?: string | null
          best_for?: string[]
          bundle_json?: Json
          category?: string
          cover_image?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          id?: string
          install_count?: number
          mobile_ready?: boolean
          preview_asset_urls?: string[]
          price?: number
          pricing_mode?: string
          rating_avg?: number | null
          rating_count?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          safety_findings?: Json
          safety_status?: string
          status?: string
          submitted_at?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_plan_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          plan_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          plan_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_plan_features_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "cms_features"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "cms_plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "cms_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_plans: {
        Row: {
          annual_discount_percentage: number
          annual_price: number | null
          contact_only: boolean
          created_at: string
          currency_code: string
          description: string
          feature_flags: Json
          id: string
          is_active: boolean
          monthly_price: number | null
          name: string
          sort_order: number
          store_limit: number | null
          trial_days: number
          updated_at: string
        }
        Insert: {
          annual_discount_percentage?: number
          annual_price?: number | null
          contact_only?: boolean
          created_at?: string
          currency_code?: string
          description: string
          feature_flags?: Json
          id: string
          is_active?: boolean
          monthly_price?: number | null
          name: string
          sort_order?: number
          store_limit?: number | null
          trial_days?: number
          updated_at?: string
        }
        Update: {
          annual_discount_percentage?: number
          annual_price?: number | null
          contact_only?: boolean
          created_at?: string
          currency_code?: string
          description?: string
          feature_flags?: Json
          id?: string
          is_active?: boolean
          monthly_price?: number | null
          name?: string
          sort_order?: number
          store_limit?: number | null
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      cms_signup_leads: {
        Row: {
          business_type: string | null
          created_at: string
          desired_plan: string | null
          email: string
          id: string
          metadata: Json
          name: string | null
          phone: string | null
          status: string
        }
        Insert: {
          business_type?: string | null
          created_at?: string
          desired_plan?: string | null
          email: string
          id?: string
          metadata?: Json
          name?: string | null
          phone?: string | null
          status?: string
        }
        Update: {
          business_type?: string | null
          created_at?: string
          desired_plan?: string | null
          email?: string
          id?: string
          metadata?: Json
          name?: string | null
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_signup_leads_desired_plan_fkey"
            columns: ["desired_plan"]
            isOneToOne: false
            referencedRelation: "cms_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          store_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          store_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order: number
          store_id: string | null
          updated_at: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order?: number
          store_id?: string | null
          updated_at?: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order?: number
          store_id?: string | null
          updated_at?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupon_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address: string
          city: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          name: string
          phone: string
          store_id: string | null
          user_id: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          name: string
          phone: string
          store_id?: string | null
          user_id: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          name?: string
          phone?: string
          store_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          bounced_at: string | null
          channel: string
          created_at: string
          dead_lettered_at: string | null
          delivered_at: string | null
          delivery_status: string | null
          error: string | null
          id: string
          last_attempt_at: string | null
          metadata: Json
          next_retry_at: string | null
          operator_escalated_at: string | null
          operator_escalation_reason: string | null
          order_id: string | null
          provider: string | null
          provider_message_id: string | null
          recipient: string | null
          retry_count: number
          status: string
          store_id: string | null
          template_name: string
        }
        Insert: {
          bounced_at?: string | null
          channel: string
          created_at?: string
          dead_lettered_at?: string | null
          delivered_at?: string | null
          delivery_status?: string | null
          error?: string | null
          id?: string
          last_attempt_at?: string | null
          metadata?: Json
          next_retry_at?: string | null
          operator_escalated_at?: string | null
          operator_escalation_reason?: string | null
          order_id?: string | null
          provider?: string | null
          provider_message_id?: string | null
          recipient?: string | null
          retry_count?: number
          status: string
          store_id?: string | null
          template_name: string
        }
        Update: {
          bounced_at?: string | null
          channel?: string
          created_at?: string
          dead_lettered_at?: string | null
          delivered_at?: string | null
          delivery_status?: string | null
          error?: string | null
          id?: string
          last_attempt_at?: string | null
          metadata?: Json
          next_retry_at?: string | null
          operator_escalated_at?: string | null
          operator_escalation_reason?: string | null
          order_id?: string | null
          provider?: string | null
          provider_message_id?: string | null
          recipient?: string | null
          retry_count?: number
          status?: string
          store_id?: string | null
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      merchant_account_statuses: {
        Row: {
          banned_at: string | null
          can_create_store: boolean
          created_at: string
          restored_at: string | null
          status_note: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string | null
          can_create_store?: boolean
          created_at?: string
          restored_at?: string | null
          status_note?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string | null
          can_create_store?: boolean
          created_at?: string
          restored_at?: string | null
          status_note?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_shipments: {
        Row: {
          booked_at: string | null
          booking_payload: Json
          cash_collection_amount: number
          consignment_id: string | null
          courier_connection_id: string | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          destination_address: string | null
          destination_city: string | null
          id: string
          latest_provider_payload: Json
          order_id: string
          picked_up_at: string | null
          provider: string
          recipient_name: string | null
          recipient_phone: string | null
          shipping_fee: number
          status: string
          store_id: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          booked_at?: string | null
          booking_payload?: Json
          cash_collection_amount?: number
          consignment_id?: string | null
          courier_connection_id?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          destination_address?: string | null
          destination_city?: string | null
          id?: string
          latest_provider_payload?: Json
          order_id: string
          picked_up_at?: string | null
          provider: string
          recipient_name?: string | null
          recipient_phone?: string | null
          shipping_fee?: number
          status?: string
          store_id: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          booked_at?: string | null
          booking_payload?: Json
          cash_collection_amount?: number
          consignment_id?: string | null
          courier_connection_id?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          destination_address?: string | null
          destination_city?: string | null
          id?: string
          latest_provider_payload?: Json
          order_id?: string
          picked_up_at?: string | null
          provider?: string
          recipient_name?: string | null
          recipient_phone?: string | null
          shipping_fee?: number
          status?: string
          store_id?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_shipments_courier_connection_id_fkey"
            columns: ["courier_connection_id"]
            isOneToOne: false
            referencedRelation: "store_courier_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_shipments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_request_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_fee: number
          id: string
          items: Json
          notes: string | null
          order_number: string
          payment_method: string
          shipping_address: string
          shipping_city: string
          status: string
          store_id: string | null
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_request_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivery_fee?: number
          id?: string
          items?: Json
          notes?: string | null
          order_number: string
          payment_method?: string
          shipping_address: string
          shipping_city: string
          status?: string
          store_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_request_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number
          id?: string
          items?: Json
          notes?: string | null
          order_number?: string
          payment_method?: string
          shipping_address?: string
          shipping_city?: string
          status?: string
          store_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          created_at: string
          details: Json
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          sort_order: number
          store_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
          store_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_qa: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          product_id: string
          question: string
          store_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          product_id: string
          question: string
          store_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          product_id?: string
          question?: string
          store_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_qa_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_qa_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          admin_reply: string | null
          author_name: string
          created_at: string
          id: string
          image_url: string | null
          order_id: string | null
          product_id: string
          rating: number
          review_text: string | null
          size_purchased: string | null
          status: string
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          author_name: string
          created_at?: string
          id?: string
          image_url?: string | null
          order_id?: string | null
          product_id: string
          rating: number
          review_text?: string | null
          size_purchased?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          author_name?: string
          created_at?: string
          id?: string
          image_url?: string | null
          order_id?: string | null
          product_id?: string
          rating?: number
          review_text?: string | null
          size_purchased?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_types: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          store_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          store_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_types_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          badge: string | null
          category: string
          colors: string[]
          created_at: string
          description: string
          featured: boolean
          id: string
          image_url: string
          images: string[]
          is_available: boolean
          name: string
          original_price: number | null
          price: number
          sizes: string[]
          stock: number
          store_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          badge?: string | null
          category?: string
          colors?: string[]
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url: string
          images?: string[]
          is_available?: boolean
          name: string
          original_price?: number | null
          price: number
          sizes?: string[]
          stock?: number
          store_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          badge?: string | null
          category?: string
          colors?: string[]
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url?: string
          images?: string[]
          is_available?: boolean
          name?: string
          original_price?: number | null
          price?: number
          sizes?: string[]
          stock?: number
          store_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          store_id: string | null
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          store_id?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          store_id?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_notifications: {
        Row: {
          created_at: string
          email: string
          id: string
          notified: boolean
          product_id: string
          store_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notified?: boolean
          product_id: string
          store_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notified?: boolean
          product_id?: string
          store_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_analytics_events: {
        Row: {
          created_at: string
          currency_code: string
          customer_id: string | null
          event_category: string
          event_name: string
          event_timestamp: string
          id: string
          metadata: Json
          order_id: string | null
          order_number: string | null
          page_path: string | null
          page_type: string | null
          product_id: string | null
          quantity: number | null
          referrer: string | null
          search_query: string | null
          session_id: string | null
          store_id: string
          traffic_campaign: string | null
          traffic_content: string | null
          traffic_medium: string | null
          traffic_source: string | null
          traffic_term: string | null
          user_agent: string | null
          value: number | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          currency_code?: string
          customer_id?: string | null
          event_category?: string
          event_name: string
          event_timestamp?: string
          id?: string
          metadata?: Json
          order_id?: string | null
          order_number?: string | null
          page_path?: string | null
          page_type?: string | null
          product_id?: string | null
          quantity?: number | null
          referrer?: string | null
          search_query?: string | null
          session_id?: string | null
          store_id: string
          traffic_campaign?: string | null
          traffic_content?: string | null
          traffic_medium?: string | null
          traffic_source?: string | null
          traffic_term?: string | null
          user_agent?: string | null
          value?: number | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          currency_code?: string
          customer_id?: string | null
          event_category?: string
          event_name?: string
          event_timestamp?: string
          id?: string
          metadata?: Json
          order_id?: string | null
          order_number?: string | null
          page_path?: string | null
          page_type?: string | null
          product_id?: string | null
          quantity?: number | null
          referrer?: string | null
          search_query?: string | null
          session_id?: string | null
          store_id?: string
          traffic_campaign?: string | null
          traffic_content?: string | null
          traffic_medium?: string | null
          traffic_source?: string | null
          traffic_term?: string | null
          user_agent?: string | null
          value?: number | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_analytics_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_analytics_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_analytics_ingestion_limits: {
        Row: {
          count: number
          identifier: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          identifier: string
          updated_at?: string
          window_start: string
        }
        Update: {
          count?: number
          identifier?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      store_backup_events: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          format: string
          id: string
          metadata: Json
          source_store_id: string | null
          store_id: string
          target_store_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          format: string
          id?: string
          metadata?: Json
          source_store_id?: string | null
          store_id: string
          target_store_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          format?: string
          id?: string
          metadata?: Json
          source_store_id?: string | null
          store_id?: string
          target_store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_backup_events_source_store_id_fkey"
            columns: ["source_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_backup_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_backup_events_target_store_id_fkey"
            columns: ["target_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_business_profiles: {
        Row: {
          business_family: string
          catalog_mode: string
          created_at: string
          enabled_modules: Json
          store_id: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          business_family?: string
          catalog_mode?: string
          created_at?: string
          enabled_modules?: Json
          store_id: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          business_family?: string
          catalog_mode?: string
          created_at?: string
          enabled_modules?: Json
          store_id?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_business_profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_cart_recovery_leads: {
        Row: {
          abandoned_at: string | null
          abandonment_window_minutes: number
          attribution_campaign: string | null
          attribution_medium: string | null
          attribution_source: string | null
          cart_snapshot: Json
          cart_value: number
          contact_capture_source: string
          contact_consent_status: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          item_count: number
          last_activity_at: string
          last_contact_at: string | null
          marketing_opt_out_at: string | null
          metadata: Json
          next_contact_at: string | null
          recovered_order_id: string | null
          recovered_revenue: number
          recovery_coupon_code: string | null
          recovery_stage: string
          session_id: string | null
          status: string
          store_id: string
          updated_at: string
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          abandoned_at?: string | null
          abandonment_window_minutes?: number
          attribution_campaign?: string | null
          attribution_medium?: string | null
          attribution_source?: string | null
          cart_snapshot?: Json
          cart_value?: number
          contact_capture_source?: string
          contact_consent_status?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          item_count?: number
          last_activity_at?: string
          last_contact_at?: string | null
          marketing_opt_out_at?: string | null
          metadata?: Json
          next_contact_at?: string | null
          recovered_order_id?: string | null
          recovered_revenue?: number
          recovery_coupon_code?: string | null
          recovery_stage?: string
          session_id?: string | null
          status?: string
          store_id: string
          updated_at?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          abandoned_at?: string | null
          abandonment_window_minutes?: number
          attribution_campaign?: string | null
          attribution_medium?: string | null
          attribution_source?: string | null
          cart_snapshot?: Json
          cart_value?: number
          contact_capture_source?: string
          contact_consent_status?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          item_count?: number
          last_activity_at?: string
          last_contact_at?: string | null
          marketing_opt_out_at?: string | null
          metadata?: Json
          next_contact_at?: string | null
          recovered_order_id?: string | null
          recovered_revenue?: number
          recovery_coupon_code?: string | null
          recovery_stage?: string
          session_id?: string | null
          status?: string
          store_id?: string
          updated_at?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_cart_recovery_leads_recovered_order_id_fkey"
            columns: ["recovered_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_cart_recovery_leads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_cart_recovery_messages: {
        Row: {
          attributed_revenue: number
          channel: string
          coupon_code: string | null
          created_at: string
          error_message: string | null
          id: string
          lead_id: string
          metadata: Json
          next_retry_at: string | null
          provider: string | null
          provider_message_id: string | null
          retry_count: number
          sent_at: string | null
          status: string
          store_id: string
          template_key: string
        }
        Insert: {
          attributed_revenue?: number
          channel: string
          coupon_code?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id: string
          metadata?: Json
          next_retry_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: string
          store_id: string
          template_key?: string
        }
        Update: {
          attributed_revenue?: number
          channel?: string
          coupon_code?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string
          metadata?: Json
          next_retry_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: string
          store_id?: string
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_cart_recovery_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "store_cart_recovery_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_cart_recovery_messages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_cod_reconciliation_entries: {
        Row: {
          amount_collected: number
          amount_remitted: number
          courier_fee: number
          courier_provider: string | null
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          note: string | null
          order_id: string | null
          reconciliation_status: string
          settlement_date: string | null
          settlement_reference: string | null
          store_id: string
          updated_at: string
          variance_amount: number
          verified_by: string | null
        }
        Insert: {
          amount_collected?: number
          amount_remitted?: number
          courier_fee?: number
          courier_provider?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          note?: string | null
          order_id?: string | null
          reconciliation_status?: string
          settlement_date?: string | null
          settlement_reference?: string | null
          store_id: string
          updated_at?: string
          variance_amount?: number
          verified_by?: string | null
        }
        Update: {
          amount_collected?: number
          amount_remitted?: number
          courier_fee?: number
          courier_provider?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          note?: string | null
          order_id?: string | null
          reconciliation_status?: string
          settlement_date?: string | null
          settlement_reference?: string | null
          store_id?: string
          updated_at?: string
          variance_amount?: number
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_cod_reconciliation_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_cod_reconciliation_entries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_courier_connections: {
        Row: {
          connection_key: string
          created_at: string
          created_by: string | null
          display_name: string | null
          id: string
          last_error: Json | null
          last_sync_at: string | null
          provider: string
          service_area_name: string | null
          settings: Json
          status: string
          store_id: string
          supports_city_delivery: boolean
          supports_cod: boolean
          updated_at: string
          zone_label: string | null
        }
        Insert: {
          connection_key?: string
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          last_error?: Json | null
          last_sync_at?: string | null
          provider: string
          service_area_name?: string | null
          settings?: Json
          status?: string
          store_id: string
          supports_city_delivery?: boolean
          supports_cod?: boolean
          updated_at?: string
          zone_label?: string | null
        }
        Update: {
          connection_key?: string
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          last_error?: Json | null
          last_sync_at?: string | null
          provider?: string
          service_area_name?: string | null
          settings?: Json
          status?: string
          store_id?: string
          supports_city_delivery?: boolean
          supports_cod?: boolean
          updated_at?: string
          zone_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_courier_connections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_courier_credentials_secure: {
        Row: {
          connection_id: string
          created_at: string
          created_by: string | null
          provider: string
          secret_payload: Json
          store_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          connection_id: string
          created_at?: string
          created_by?: string | null
          provider: string
          secret_payload?: Json
          store_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          connection_id?: string
          created_at?: string
          created_by?: string | null
          provider?: string
          secret_payload?: Json
          store_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_courier_credentials_secure_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "store_courier_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_courier_credentials_secure_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_deletion_records: {
        Row: {
          admin_note: string | null
          created_at: string
          deleted_by_user_id: string | null
          deleted_store_id: string
          deletion_source: string
          id: string
          merchant_visible_reason: string
          owner_can_create_store: boolean | null
          owner_user_id: string | null
          store_name: string
          store_slug: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          deleted_by_user_id?: string | null
          deleted_store_id: string
          deletion_source: string
          id?: string
          merchant_visible_reason: string
          owner_can_create_store?: boolean | null
          owner_user_id?: string | null
          store_name: string
          store_slug: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          deleted_by_user_id?: string | null
          deleted_store_id?: string
          deletion_source?: string
          id?: string
          merchant_visible_reason?: string
          owner_can_create_store?: boolean | null
          owner_user_id?: string | null
          store_name?: string
          store_slug?: string
        }
        Relationships: []
      }
      store_domains: {
        Row: {
          activated_at: string | null
          cloudflare_hostname_id: string | null
          cloudflare_hostname_status: string | null
          cloudflare_ssl_status: string | null
          configured_by: string | null
          created_at: string
          dns_records: Json
          domain_type: string
          hostname: string
          id: string
          is_primary: boolean
          is_www_domain: boolean
          last_checked_at: string | null
          last_cloudflare_error: Json | null
          last_vercel_error: Json | null
          status: string
          store_id: string
          updated_at: string
          vercel_misconfigured: boolean
          vercel_verified: boolean
          verification_records: Json
        }
        Insert: {
          activated_at?: string | null
          cloudflare_hostname_id?: string | null
          cloudflare_hostname_status?: string | null
          cloudflare_ssl_status?: string | null
          configured_by?: string | null
          created_at?: string
          dns_records?: Json
          domain_type?: string
          hostname: string
          id?: string
          is_primary?: boolean
          is_www_domain?: boolean
          last_checked_at?: string | null
          last_cloudflare_error?: Json | null
          last_vercel_error?: Json | null
          status?: string
          store_id: string
          updated_at?: string
          vercel_misconfigured?: boolean
          vercel_verified?: boolean
          verification_records?: Json
        }
        Update: {
          activated_at?: string | null
          cloudflare_hostname_id?: string | null
          cloudflare_hostname_status?: string | null
          cloudflare_ssl_status?: string | null
          configured_by?: string | null
          created_at?: string
          dns_records?: Json
          domain_type?: string
          hostname?: string
          id?: string
          is_primary?: boolean
          is_www_domain?: boolean
          last_checked_at?: string | null
          last_cloudflare_error?: Json | null
          last_vercel_error?: Json | null
          status?: string
          store_id?: string
          updated_at?: string
          vercel_misconfigured?: boolean
          vercel_verified?: boolean
          verification_records?: Json
        }
        Relationships: [
          {
            foreignKeyName: "store_domains_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_feature_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          feature_key: string
          id: string
          note: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled: boolean
          feature_key: string
          id?: string
          note?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          feature_key?: string
          id?: string
          note?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_feature_overrides_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "cms_features"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "store_feature_overrides_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_invoices: {
        Row: {
          amount: number
          billing_interval: string
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          payment_method: string | null
          plan_id: string
          provider: string | null
          provider_invoice_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          billing_interval?: string
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          plan_id: string
          provider?: string | null
          provider_invoice_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_interval?: string
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          plan_id?: string
          provider?: string | null
          provider_invoice_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "cms_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_lifecycle_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          message: string | null
          metadata: Json
          status: string
          store_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json
          status?: string
          store_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_lifecycle_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_lifecycle_states: {
        Row: {
          archived_at: string | null
          created_at: string
          deleted_at: string | null
          last_activity_at: string | null
          last_reminder_at: string | null
          last_storefront_activity_at: string | null
          lifecycle_status: Database["public"]["Enums"]["store_lifecycle_status"]
          manual_hold: boolean
          next_reminder_at: string | null
          reminder_1_sent_at: string | null
          reminder_2_sent_at: string | null
          reminder_3_sent_at: string | null
          reminder_count: number
          scheduled_delete_at: string | null
          status_reason: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          last_activity_at?: string | null
          last_reminder_at?: string | null
          last_storefront_activity_at?: string | null
          lifecycle_status?: Database["public"]["Enums"]["store_lifecycle_status"]
          manual_hold?: boolean
          next_reminder_at?: string | null
          reminder_1_sent_at?: string | null
          reminder_2_sent_at?: string | null
          reminder_3_sent_at?: string | null
          reminder_count?: number
          scheduled_delete_at?: string | null
          status_reason?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          last_activity_at?: string | null
          last_reminder_at?: string | null
          last_storefront_activity_at?: string | null
          lifecycle_status?: Database["public"]["Enums"]["store_lifecycle_status"]
          manual_hold?: boolean
          next_reminder_at?: string | null
          reminder_1_sent_at?: string | null
          reminder_2_sent_at?: string | null
          reminder_3_sent_at?: string | null
          reminder_count?: number
          scheduled_delete_at?: string | null
          status_reason?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_lifecycle_states_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_memberships: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["store_member_role"]
          store_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["store_member_role"]
          store_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["store_member_role"]
          store_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_memberships_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_page_blocks: {
        Row: {
          block_type: string
          created_at: string
          custom_css: string | null
          custom_html: string | null
          effect_override: boolean | null
          entrance_animation: string | null
          hover_effect: string | null
          id: string
          is_visible: boolean
          layout_variant: string | null
          variant_options: Json | null
          page_id: string
          props: Json
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          block_type: string
          created_at?: string
          custom_css?: string | null
          custom_html?: string | null
          effect_override?: boolean | null
          entrance_animation?: string | null
          hover_effect?: string | null
          id?: string
          is_visible?: boolean
          layout_variant?: string | null
          variant_options?: Json | null
          page_id: string
          props?: Json
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          block_type?: string
          created_at?: string
          custom_css?: string | null
          custom_html?: string | null
          effect_override?: boolean | null
          entrance_animation?: string | null
          hover_effect?: string | null
          id?: string
          is_visible?: boolean
          layout_variant?: string | null
          variant_options?: Json | null
          page_id?: string
          props?: Json
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_page_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "store_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_page_blocks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_page_revisions: {
        Row: {
          blocks_snapshot: Json
          changed_by: string | null
          created_at: string
          id: string
          page_id: string
          revision_label: string
          store_id: string
        }
        Insert: {
          blocks_snapshot?: Json
          changed_by?: string | null
          created_at?: string
          id?: string
          page_id: string
          revision_label?: string
          store_id: string
        }
        Update: {
          blocks_snapshot?: Json
          changed_by?: string | null
          created_at?: string
          id?: string
          page_id?: string
          revision_label?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_page_revisions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "store_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_page_revisions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_pages: {
        Row: {
          created_at: string
          id: string
          is_homepage: boolean
          seo_description: string | null
          seo_title: string | null
          slug: string
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_homepage?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          store_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_homepage?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          store_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_pages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_payment_connections_secure: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          provider: string
          public_metadata: Json
          revoked_at: string | null
          revoked_by: string | null
          secret_payload: Json
          status: string
          store_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          provider: string
          public_metadata?: Json
          revoked_at?: string | null
          revoked_by?: string | null
          secret_payload?: Json
          status?: string
          store_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          provider?: string
          public_metadata?: Json
          revoked_at?: string | null
          revoked_by?: string | null
          secret_payload?: Json
          status?: string
          store_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_payment_connections_secure_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_return_requests: {
        Row: {
          approved_amount: number
          courier_status: string
          created_at: string
          created_by: string | null
          customer_note: string | null
          id: string
          internal_note: string | null
          metadata: Json
          order_id: string
          reason: string
          refund_mode: string | null
          request_type: string
          requested_amount: number
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          rma_code: string | null
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          approved_amount?: number
          courier_status?: string
          created_at?: string
          created_by?: string | null
          customer_note?: string | null
          id?: string
          internal_note?: string | null
          metadata?: Json
          order_id: string
          reason: string
          refund_mode?: string | null
          request_type: string
          requested_amount?: number
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          rma_code?: string | null
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          approved_amount?: number
          courier_status?: string
          created_at?: string
          created_by?: string | null
          customer_note?: string | null
          id?: string
          internal_note?: string | null
          metadata?: Json
          order_id?: string
          reason?: string
          refund_mode?: string | null
          request_type?: string
          requested_amount?: number
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          rma_code?: string | null
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_return_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_revenue_events: {
        Row: {
          attribution_campaign: string | null
          attribution_medium: string | null
          attribution_source: string | null
          created_at: string
          currency_code: string
          customer_id: string | null
          event_timestamp: string
          event_type: string
          gross_amount: number
          id: string
          metadata: Json
          net_amount: number
          order_id: string
          payment_method: string | null
          refund_amount: number
          status: string | null
          store_id: string
        }
        Insert: {
          attribution_campaign?: string | null
          attribution_medium?: string | null
          attribution_source?: string | null
          created_at?: string
          currency_code?: string
          customer_id?: string | null
          event_timestamp?: string
          event_type: string
          gross_amount?: number
          id?: string
          metadata?: Json
          net_amount?: number
          order_id: string
          payment_method?: string | null
          refund_amount?: number
          status?: string | null
          store_id: string
        }
        Update: {
          attribution_campaign?: string | null
          attribution_medium?: string | null
          attribution_source?: string | null
          created_at?: string
          currency_code?: string
          customer_id?: string | null
          event_timestamp?: string
          event_type?: string
          gross_amount?: number
          id?: string
          metadata?: Json
          net_amount?: number
          order_id?: string
          payment_method?: string | null
          refund_amount?: number
          status?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_revenue_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_revenue_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_staff_invites: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string | null
          id: string
          invite_code: string
          metadata: Json
          role: Database["public"]["Enums"]["store_member_role"]
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          invite_code: string
          metadata?: Json
          role?: Database["public"]["Enums"]["store_member_role"]
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          metadata?: Json
          role?: Database["public"]["Enums"]["store_member_role"]
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_staff_invites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_subscriptions: {
        Row: {
          created_at: string
          current_period_ends_at: string | null
          id: string
          plan_id: string
          provider: string | null
          provider_subscription_id: string | null
          status: string
          store_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_ends_at?: string | null
          id?: string
          plan_id: string
          provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          store_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_ends_at?: string | null
          id?: string
          plan_id?: string
          provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          store_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "cms_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_themes: {
        Row: {
          aesthetic: string
          colors: Json
          components: Json
          created_at: string
          custom_css: string | null
          density_scale: number
          effects: Json
          id: string
          mode: string
          overrides: Json
          palette_seed: string | null
          palette_source: string | null
          preset_id: string
          radius_scale: number
          resolved_tokens: Json
          schema_version: number
          store_id: string
          theme_package_id: string | null
          theme_package_version: number | null
          typography: Json
          updated_at: string
        }
        Insert: {
          aesthetic?: string
          colors?: Json
          components?: Json
          created_at?: string
          custom_css?: string | null
          density_scale?: number
          effects?: Json
          id?: string
          mode?: string
          overrides?: Json
          palette_seed?: string | null
          palette_source?: string | null
          preset_id?: string
          radius_scale?: number
          resolved_tokens?: Json
          schema_version?: number
          store_id: string
          theme_package_id?: string | null
          theme_package_version?: number | null
          typography?: Json
          updated_at?: string
        }
        Update: {
          aesthetic?: string
          colors?: Json
          components?: Json
          created_at?: string
          custom_css?: string | null
          density_scale?: number
          effects?: Json
          id?: string
          mode?: string
          overrides?: Json
          palette_seed?: string | null
          palette_source?: string | null
          preset_id?: string
          radius_scale?: number
          resolved_tokens?: Json
          schema_version?: number
          store_id?: string
          theme_package_id?: string | null
          theme_package_version?: number | null
          typography?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_themes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_themes_theme_package_id_fkey"
            columns: ["theme_package_id"]
            isOneToOne: false
            referencedRelation: "theme_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          currency_code: string
          custom_domain: string | null
          description: string | null
          favicon_url: string | null
          id: string
          is_published: boolean
          lifecycle_status: string
          locale: string
          logo_url: string | null
          name: string
          owner_id: string | null
          plan: string
          slug: string
          store_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          custom_domain?: string | null
          description?: string | null
          favicon_url?: string | null
          id?: string
          is_published?: boolean
          lifecycle_status?: string
          locale?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          plan?: string
          slug: string
          store_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          custom_domain?: string | null
          description?: string | null
          favicon_url?: string | null
          id?: string
          is_published?: boolean
          lifecycle_status?: string
          locale?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          plan?: string
          slug?: string
          store_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      theme_packages: {
        Row: {
          compatibility_version: number
          component_recipes: Json
          created_at: string
          created_by: string | null
          custom_css: string | null
          description: string
          id: string
          is_active: boolean
          mode: string
          name: string
          owner_store_id: string | null
          preset_id: string
          preview_metadata: Json
          slug: string
          source_type: string
          tokens: Json
          updated_at: string
          version: number
        }
        Insert: {
          compatibility_version?: number
          component_recipes?: Json
          created_at?: string
          created_by?: string | null
          custom_css?: string | null
          description?: string
          id?: string
          is_active?: boolean
          mode?: string
          name: string
          owner_store_id?: string | null
          preset_id?: string
          preview_metadata?: Json
          slug: string
          source_type?: string
          tokens?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          compatibility_version?: number
          component_recipes?: Json
          created_at?: string
          created_by?: string | null
          custom_css?: string | null
          description?: string
          id?: string
          is_active?: boolean
          mode?: string
          name?: string
          owner_store_id?: string | null
          preset_id?: string
          preview_metadata?: Json
          slug?: string
          source_type?: string
          tokens?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "theme_packages_owner_store_id_fkey"
            columns: ["owner_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_email_feature_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          feature_key: string
          id: string
          normalized_email: string
          note: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled: boolean
          feature_key: string
          id?: string
          normalized_email: string
          note?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          feature_key?: string
          id?: string
          normalized_email?: string
          note?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_email_feature_overrides_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "cms_features"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_email_feature_overrides_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_product_reviews: {
        Row: {
          admin_reply: string | null
          author_name: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          product_id: string | null
          rating: number | null
          review_text: string | null
          size_purchased: string | null
        }
        Insert: {
          admin_reply?: string | null
          author_name?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          product_id?: string | null
          rating?: number | null
          review_text?: string | null
          size_purchased?: string | null
        }
        Update: {
          admin_reply?: string | null
          author_name?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          product_id?: string | null
          rating?: number | null
          review_text?: string | null
          size_purchased?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_manage_store: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      check_contact_rate_limit: { Args: { _email: string }; Returns: boolean }
      check_store_lifecycles: { Args: never; Returns: undefined }
      claim_coupon:
        | { Args: { _code: string; _order_total: number }; Returns: Json }
        | {
            Args: { _code: string; _order_total: number; _store_id: string }
            Returns: Json
          }
      create_store_order_with_stock: {
        Args: {
          _client_request_id: string
          _coupon_code: string
          _customer_email: string
          _customer_name: string
          _customer_phone: string
          _delivery_fee: number
          _discount_amount: number
          _items: Json
          _notes: string
          _payment_method: string
          _shipping_address: string
          _shipping_city: string
          _store_id: string
          _user_id: string
        }
        Returns: {
          delivery_fee: number
          id: string
          order_number: string
          subtotal: number
          total: number
        }[]
      }
      get_user_id_by_email: { Args: { email_to_find: string }; Returns: string }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_store_admin: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      sync_store_custom_domain_from_domains: {
        Args: { _store_id: string }
        Returns: undefined
      }
      validate_coupon:
        | { Args: { _code: string; _order_total: number }; Returns: Json }
        | {
            Args: { _code: string; _order_total: number; _store_id: string }
            Returns: Json
          }
    }
    Enums: {
      app_role: "admin" | "co_admin"
      store_lifecycle_status:
        | "active"
        | "at_risk"
        | "reminded"
        | "archived"
        | "pending_delete"
        | "deleted"
      store_member_role: "owner" | "admin" | "editor" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "co_admin"],
      store_lifecycle_status: [
        "active",
        "at_risk",
        "reminded",
        "archived",
        "pending_delete",
        "deleted",
      ],
      store_member_role: ["owner", "admin", "editor", "viewer"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
