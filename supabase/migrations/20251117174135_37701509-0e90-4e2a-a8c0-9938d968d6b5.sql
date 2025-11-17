-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  patient_name TEXT NOT NULL,
  dentist_name TEXT NOT NULL,
  clinic_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  date DATE NOT NULL,
  selected_teeth TEXT[] NOT NULL,
  smile_photo_url TEXT,
  scan_file_url TEXT,
  additional_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert orders (public form)
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
WITH CHECK (true);

-- Create policy to allow anyone to view orders (for admin panel)
CREATE POLICY "Anyone can view orders"
ON public.orders
FOR SELECT
USING (true);

-- Create policy to allow anyone to update orders (for admin panel)
CREATE POLICY "Anyone can update orders"
ON public.orders
FOR UPDATE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for order files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-files', 'order-files', true);

-- Create storage policies
CREATE POLICY "Anyone can upload order files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'order-files');

CREATE POLICY "Anyone can view order files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'order-files');

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;