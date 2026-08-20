-- Restore cancellation inventory handling if the original trigger/function drifted
-- out of an existing environment. Order creation already decrements inventory in
-- create_store_order_with_stock; cancellation must be the exact inverse once.

CREATE OR REPLACE FUNCTION public.handle_order_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _line record;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    IF jsonb_typeof(NEW.items) = 'array' THEN
      FOR _line IN
        SELECT
          (item.value->>'productId')::uuid AS product_id,
          (item.value->>'quantity')::integer AS quantity
        FROM jsonb_array_elements(NEW.items) AS item(value)
      LOOP
        IF _line.product_id IS NOT NULL AND _line.quantity IS NOT NULL AND _line.quantity > 0 THEN
          UPDATE public.products
          SET stock = stock + _line.quantity,
              is_available = CASE WHEN stock + _line.quantity > 0 THEN true ELSE is_available END,
              updated_at = now()
          WHERE id = _line.product_id
            AND store_id = NEW.store_id;
        END IF;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_order_cancellation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_order_cancellation() TO service_role;

DROP TRIGGER IF EXISTS trg_order_cancellation ON public.orders;
CREATE TRIGGER trg_order_cancellation
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION public.handle_order_cancellation();

COMMENT ON FUNCTION public.handle_order_cancellation() IS
  'Restores product stock exactly once when an order transitions into cancelled.';
