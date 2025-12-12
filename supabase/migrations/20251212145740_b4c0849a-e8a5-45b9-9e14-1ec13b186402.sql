-- Drop the existing policy that requires authentication for profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Create a new policy that allows anyone to view profiles (for public orders list)
CREATE POLICY "Anyone can view profiles" 
ON public.profiles 
FOR SELECT 
USING (true);