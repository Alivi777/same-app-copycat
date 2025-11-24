-- Add patient_id field to orders table
ALTER TABLE public.orders 
ADD COLUMN patient_id text;