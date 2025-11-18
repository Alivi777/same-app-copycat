-- Add technical configuration fields to orders table
ALTER TABLE public.orders 
ADD COLUMN material text,
ADD COLUMN prosthesis_type text,
ADD COLUMN color text,
ADD COLUMN delivery_deadline date;