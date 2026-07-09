-- Add pg_net extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to trigger notifications on order updates
CREATE OR REPLACE FUNCTION public.handle_order_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_payload jsonb;
BEGIN
  -- Handle new orders (INSERT)
  IF TG_OP = 'INSERT' THEN
    v_payload := json_build_object(
      'templateName', 'order-receipt',
      'order_id', NEW.order_number,
      'store_id', NEW.store_id,
      'customer_email', NEW.customer_email,
      'customer_phone', NEW.customer_phone,
      'customer_name', NEW.customer_name,
      'total', NEW.total,
      'status', NEW.status
    );
  
  -- Handle order status changes (UPDATE)
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'shipped' OR NEW.status = 'delivered' OR NEW.status = 'cancelled' THEN
      v_payload := json_build_object(
        'templateName', 'order-' || NEW.status, -- e.g., 'order-shipped'
        'order_id', NEW.order_number,
        'store_id', NEW.store_id,
        'customer_email', NEW.customer_email,
        'customer_phone', NEW.customer_phone,
        'customer_name', NEW.customer_name,
        'total', NEW.total,
        'status', NEW.status
      );
    END IF;
  END IF;

  -- Dispatch webhook if payload was constructed
  IF v_payload IS NOT NULL THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.edge_function_url', true) || '/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := v_payload
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_order_notifications ON public.orders;

-- Create trigger on orders table
CREATE TRIGGER on_order_notifications
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_notifications();
