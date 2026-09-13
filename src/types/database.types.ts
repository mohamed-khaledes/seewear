/**
 * Mirrors supabase/migrations. Regenerate once the project is linked:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: Database["public"]["Enums"]["user_role"];
          is_demo: boolean;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          is_demo?: boolean;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          is_demo?: boolean;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: { id: string; slug: string; name: string; position: number };
        Insert: { id?: string; slug: string; name: string; position?: number };
        Update: { id?: string; slug?: string; name?: string; position?: number };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          category_id: string | null;
          price_cents: number;
          compare_at_cents: number | null;
          status: Database["public"]["Enums"]["product_status"];
          featured: boolean;
          on_sale: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          category_id?: string | null;
          price_cents: number;
          compare_at_cents?: number | null;
          status?: Database["public"]["Enums"]["product_status"];
          featured?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          category_id?: string | null;
          price_cents?: number;
          compare_at_cents?: number | null;
          status?: Database["public"]["Enums"]["product_status"];
          featured?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          alt: string | null;
          position: number;
        };
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          alt?: string | null;
          position?: number;
        };
        Update: {
          id?: string;
          product_id?: string;
          url?: string;
          alt?: string | null;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          color: string | null;
          color_hex: string | null;
          size: string | null;
          sku: string | null;
          stock: number;
          price_cents: number | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          color?: string | null;
          color_hex?: string | null;
          size?: string | null;
          sku?: string | null;
          stock?: number;
          price_cents?: number | null;
        };
        Update: {
          id?: string;
          product_id?: string;
          color?: string | null;
          color_hex?: string | null;
          size?: string | null;
          sku?: string | null;
          stock?: number;
          price_cents?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      carts: {
        Row: { id: string; user_id: string; updated_at: string };
        Insert: { id?: string; user_id: string; updated_at?: string };
        Update: { id?: string; user_id?: string; updated_at?: string };
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cart_items: {
        Row: { id: string; cart_id: string; variant_id: string; quantity: number };
        Insert: { id?: string; cart_id: string; variant_id: string; quantity: number };
        Update: { id?: string; cart_id?: string; variant_id?: string; quantity?: number };
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey";
            columns: ["variant_id"];
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string | null;
          email: string;
          status: Database["public"]["Enums"]["order_status"];
          subtotal_cents: number;
          shipping_cents: number;
          discount_cents: number;
          tax_cents: number;
          total_cents: number;
          currency: string;
          shipping_address: Json;
          discount_code: string | null;
          fulfilled_at: string | null;
          delivered_at: string | null;
          courier: string | null;
          tracking_number: string | null;
          tracking_url: string | null;
          status_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          user_id?: string | null;
          email: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_cents: number;
          shipping_cents?: number;
          discount_cents?: number;
          tax_cents?: number;
          total_cents: number;
          currency?: string;
          shipping_address: Json;
          discount_code?: string | null;
          fulfilled_at?: string | null;
          delivered_at?: string | null;
          courier?: string | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
          status_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string | null;
          email?: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_cents?: number;
          shipping_cents?: number;
          discount_cents?: number;
          tax_cents?: number;
          total_cents?: number;
          currency?: string;
          shipping_address?: Json;
          discount_code?: string | null;
          fulfilled_at?: string | null;
          delivered_at?: string | null;
          courier?: string | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
          status_note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      order_events: {
        Row: {
          id: string;
          order_id: string;
          status: Database["public"]["Enums"]["order_status"];
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: Database["public"]["Enums"]["order_status"];
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: Database["public"]["Enums"]["order_status"];
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          name: string;
          slug: string | null;
          color: string | null;
          size: string | null;
          image_url: string | null;
          price_cents: number;
          quantity: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          name: string;
          slug?: string | null;
          color?: string | null;
          size?: string | null;
          image_url?: string | null;
          price_cents: number;
          quantity: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          variant_id?: string | null;
          name?: string;
          slug?: string | null;
          color?: string | null;
          size?: string | null;
          image_url?: string | null;
          price_cents?: number;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          provider: string;
          paymob_order_id: string | null;
          transaction_id: string | null;
          method: string | null;
          amount_cents: number;
          status: string;
          hmac_verified: boolean;
          raw: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          provider?: string;
          paymob_order_id?: string | null;
          transaction_id?: string | null;
          method?: string | null;
          amount_cents: number;
          status: string;
          hmac_verified?: boolean;
          raw?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          provider?: string;
          paymob_order_id?: string | null;
          transaction_id?: string | null;
          method?: string | null;
          amount_cents?: number;
          status?: string;
          hmac_verified?: boolean;
          raw?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      wishlist_items: {
        Row: { user_id: string; product_id: string; created_at: string };
        Insert: { user_id: string; product_id: string; created_at?: string };
        Update: { user_id?: string; product_id?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlist_items_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      discount_codes: {
        Row: {
          id: string;
          code: string;
          percent_off: number | null;
          amount_off_cents: number | null;
          min_subtotal_cents: number;
          active: boolean;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          percent_off?: number | null;
          amount_off_cents?: number | null;
          min_subtotal_cents?: number;
          active?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          percent_off?: number | null;
          amount_off_cents?: number | null;
          min_subtotal_cents?: number;
          active?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      store_settings: {
        Row: {
          id: number;
          store_name: string;
          support_email: string;
          support_phone: string | null;
          announcement: string | null;
          free_shipping_threshold_cents: number;
          shipping_flat_cents: number;
          tax_rate: number;
          updated_at: string;
        };
        Insert: {
          id?: number;
          store_name?: string;
          support_email?: string;
          support_phone?: string | null;
          announcement?: string | null;
          free_shipping_threshold_cents?: number;
          shipping_flat_cents?: number;
          tax_rate?: number;
          updated_at?: string;
        };
        Update: {
          id?: number;
          store_name?: string;
          support_email?: string;
          support_phone?: string | null;
          announcement?: string | null;
          free_shipping_threshold_cents?: number;
          shipping_flat_cents?: number;
          tax_rate?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_demo: { Args: Record<PropertyKey, never>; Returns: boolean };
      next_order_number: { Args: Record<PropertyKey, never>; Returns: string };
      apply_paid_order: { Args: { p_order_id: string }; Returns: boolean };
      merge_guest_cart: { Args: { p_items: Json }; Returns: undefined };
      replace_cart: { Args: { p_items: Json }; Returns: undefined };
      admin_dashboard_stats: { Args: { p_days?: number }; Returns: Json };
    };
    Enums: {
      user_role: "admin" | "user";
      order_status:
        | "pending"
        | "paid"
        | "fulfilled"
        | "delivered"
        | "cancelled"
        | "refunded";
      product_status: "active" | "draft";
    };
    CompositeTypes: Record<never, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
