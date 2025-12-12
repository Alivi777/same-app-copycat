-- Drop the existing policy that requires authentication
DROP POLICY IF EXISTS "Authenticated users can view all orders" ON public.orders;

-- Create a new policy that allows anyone to view orders (including unauthenticated users)
CREATE POLICY "Anyone can view orders" 
ON public.orders 
FOR SELECT 
USING (true);