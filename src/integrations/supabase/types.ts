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
      page_blueprints: {
        Row: {
          business_family: string
          catalog_modes: Json
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          page_payload: Json
          updated_at: string
        }
        Insert: {
          business_family?: string
          catalog_modes?: Json
          created_at?: string
          description?: string
          id: string
          is_active?: boolean
          name: string
          page_payload?: Json
          updated_at?: string
        }
        Update: {
          business_family?: string
          catalog_modes?: Json
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          page_payload?: Json
          updated_at?: string
        }
        Relationships: []
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
          channel: string
          created_at: string
          error: string | null
          id: string
          metadata: Json
          order_id: string | null
          provider: string | null
          provider_message_id: string | null
          recipient: string | null
          status: string
          store_id: string | null
          template_name: string
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          provider?: string | null
          provider_message_id?: string | null
          recipient?: string | null
          status: string
          store_id?: string | null
          template_name: string
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          provider?: string | null
          provider_message_id?: string | null
          recipient?: string | null
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
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          amount: number
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
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
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
          id: string
          is_visible: boolean
          page_id: string
          props: Json
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          block_type: string
          created_at?: string
          id?: string
          is_visible?: boolean
          page_id: string
          props?: Json
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          block_type?: string
          created_at?: string
          id?: string
          is_visible?: boolean
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
      store_business_profiles: {
        Row: {
          blueprint_id: string | null
          blueprint_version: number | null
          business_family: string
          catalog_mode: string
          created_at: string
          enabled_modules: Json
          store_id: string
          updated_at: string
        }
        Insert: {
          blueprint_id?: string | null
          blueprint_version?: number | null
          business_family?: string
          catalog_mode?: string
          created_at?: string
          enabled_modules?: Json
          store_id: string
          updated_at?: string
        }
        Update: {
          blueprint_id?: string | null
          blueprint_version?: number | null
          business_family?: string
          catalog_mode?: string
          created_at?: string
          enabled_modules?: Json
          store_id?: string
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
      store_themes: {
        Row: {
          colors: Json
          components: Json
          created_at: string
          custom_css: string | null
          id: string
          mode: string
          overrides: Json
          preset_id: string
          resolved_tokens: Json
          store_id: string
          theme_package_id: string | null
          theme_package_version: number | null
          typography: Json
          updated_at: string
        }
        Insert: {
          colors?: Json
          components?: Json
          created_at?: string
          custom_css?: string | null
          id?: string
          mode?: string
          overrides?: Json
          preset_id?: string
          resolved_tokens?: Json
          store_id: string
          theme_package_id?: string | null
          theme_package_version?: number | null
          typography?: Json
          updated_at?: string
        }
        Update: {
          colors?: Json
          components?: Json
          created_at?: string
          custom_css?: string | null
          id?: string
          mode?: string
          overrides?: Json
          preset_id?: string
          resolved_tokens?: Json
          store_id: string
          theme_package_id?: string | null
          theme_package_version?: number | null
          typography?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_themes_theme_package_id_fkey"
            columns: ["theme_package_id"]
            isOneToOne: false
            referencedRelation: "theme_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_themes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
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
      store_blueprints: {
        Row: {
          business_family: string
          catalog_mode: string
          created_at: string
          default_site_settings: Json
          default_theme: Json
          description: string
          group_name: string
          hero_payload: Json
          id: string
          is_active: boolean
          legacy_template_id: string | null
          name: string
          onboarding_schema: Json
          recommended_block_set: Json
          recommended_page_set: Json
          required_capabilities: Json
          short_name: string
          store_description: string
          updated_at: string
        }
        Insert: {
          business_family?: string
          catalog_mode?: string
          created_at?: string
          default_site_settings?: Json
          default_theme?: Json
          description?: string
          group_name?: string
          hero_payload?: Json
          id: string
          is_active?: boolean
          legacy_template_id?: string | null
          name: string
          onboarding_schema?: Json
          recommended_block_set?: Json
          recommended_page_set?: Json
          required_capabilities?: Json
          short_name: string
          store_description?: string
          updated_at?: string
        }
        Update: {
          business_family?: string
          catalog_mode?: string
          created_at?: string
          default_site_settings?: Json
          default_theme?: Json
          description?: string
          group_name?: string
          hero_payload?: Json
          id?: string
          is_active?: boolean
          legacy_template_id?: string | null
          name?: string
          onboarding_schema?: Json
          recommended_block_set?: Json
          recommended_page_set?: Json
          required_capabilities?: Json
          short_name?: string
          store_description?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_store_admin: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
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
} as const
