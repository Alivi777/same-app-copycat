import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToothSelection, ToothConfig } from "@/components/tooth-selection";
import { ToothConfiguration } from "@/components/tooth-configuration";
import { User, FileText, Upload, Phone, Mail, MapPin, Calendar, ClipboardList, Plus, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { OrdersList } from "@/components/OrdersList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Index() {
  const { toast } = useToast();
  const [toothConfigs, setToothConfigs] = useState<ToothConfig[]>([]);
  const [smilePhoto, setSmilePhoto] = useState<File | null>(null);
  const [scanFile, setScanFile] = useState<File | null>(null);
  
  const [color, setColor] = useState<string>("");
  const [deliveryDeadline, setDeliveryDeadline] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");

  const form = useForm({
    defaultValues: {
      patientId: "",
      patientName: "",
      dentistName: "",
      clinicName: "",
      phone: "",
      email: "",
      address: "",
      date: "",
      additionalNotes: "",
    },
  });

  const onSubmit = async (data: any) => {
    // Validation for required fields
    if (toothConfigs.length === 0) {
      toast({
        title: "Seleção de Dentes Obrigatória",
        description: "Por favor, selecione pelo menos um dente antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    if (!color) {
      toast({
        title: "Cor Obrigatória",
        description: "Por favor, selecione uma cor antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    setUploadMessage("Preparando envio...");
    
    try {
      const orderNumber = `OS-${Date.now()}`;
      
      setUploadProgress(10);
      setUploadMessage("Enviando arquivos...");

      // Parallel uploads for better performance
      const uploadPromises: Promise<{ type: string; path: string | null }>[] = [];
      const totalFiles = (smilePhoto ? 1 : 0) + (scanFile ? 1 : 0);
      let uploadedFiles = 0;

      if (smilePhoto) {
        const fileExt = smilePhoto.name.split('.').pop();
        const filePath = `${orderNumber}/smile.${fileExt}`;
        uploadPromises.push(
          supabase.storage
            .from('order-files')
            .upload(filePath, smilePhoto)
            .then(({ error }) => {
              uploadedFiles++;
              setUploadProgress(10 + (uploadedFiles / totalFiles) * 50);
              setUploadMessage(`Arquivo ${uploadedFiles} de ${totalFiles} enviado`);
              return { type: 'smile', path: error ? null : filePath };
            })
        );
      }

      if (scanFile) {
        const fileExt = scanFile.name.split('.').pop();
        const filePath = `${orderNumber}/scan.${fileExt}`;
        uploadPromises.push(
          supabase.storage
            .from('order-files')
            .upload(filePath, scanFile)
            .then(({ error }) => {
              uploadedFiles++;
              setUploadProgress(10 + (uploadedFiles / totalFiles) * 50);
              setUploadMessage(`Arquivo ${uploadedFiles} de ${totalFiles} enviado`);
              return { type: 'scan', path: error ? null : filePath };
            })
        );
      }

      const uploadResults = await Promise.all(uploadPromises);
      const smilePhotoUrl = uploadResults.find(r => r.type === 'smile')?.path || null;
      const scanFileUrl = uploadResults.find(r => r.type === 'scan')?.path || null;

      setUploadProgress(70);
      setUploadMessage("Salvando pedido...");

      const { error: insertError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          patient_id: data.patientId,
          patient_name: data.patientName,
          dentist_name: data.dentistName,
          clinic_name: data.clinicName,
          phone: data.phone,
          email: data.email,
          address: data.address,
          date: data.date || null,
          selected_teeth: toothConfigs.map(c => c.toothNumber),
          smile_photo_url: smilePhotoUrl,
          scan_file_url: scanFileUrl,
          additional_notes: data.additionalNotes + (toothConfigs.length > 0 ? `\n\n--- Configuração por Dente ---\n${toothConfigs.map(c => `Dente ${c.toothNumber}: ${c.workType}${c.implantType ? ` (${c.implantType})` : ''}${c.material ? ` [${c.material}]` : ''}`).join('\n')}` : ''),
          material: toothConfigs.length > 0 ? toothConfigs[0].material || null : null,
          prosthesis_type: null,
          color: color || null,
          delivery_deadline: deliveryDeadline || null,
          status: 'pending'
        });

      if (insertError) throw insertError;

      setUploadProgress(100);
      setUploadMessage("Pedido enviado com sucesso!");

      toast({
        title: "Ordem de Serviço Enviada",
        description: "A ordem de serviço foi registrada com sucesso!",
      });

      // Reset form
      form.reset();
      setToothConfigs([]);
      setSmilePhoto(null);
      setScanFile(null);
      setColor("");
      setDeliveryDeadline("");
    } catch (error) {
      console.error('Error submitting order:', error);
      toast({
        title: "Erro ao Enviar",
        description: "Ocorreu um erro ao enviar a ordem de serviço. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      setUploadMessage("");
    }
  };

  const handleSmilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSmilePhoto(e.target.files[0]);
    }
  };

  const handleScanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScanFile(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/header-logo-new.png" alt="Logo" className="w-8 h-8" />
              <h1 className="text-2xl font-bold text-gray-900">Laboratório Odontológico</h1>
            </div>
            <Button variant="outline" onClick={() => window.location.href = "/login"}>
              Área Admin
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="novo-pedido" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="novo-pedido" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Novo Pedido
            </TabsTrigger>
            <TabsTrigger value="lista-pedidos" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Ver Pedidos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="novo-pedido">
            {/* Form Title */}
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Ordem de Serviço Odontológica</h2>
              <p className="text-gray-600">Preencha os dados do paciente e especificações técnicas</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Patient Information Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <User className="text-burgundy-500" size={20} />
                      Informações do Paciente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="patientName"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Nome do Paciente</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome completo do paciente" {...field} required />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="patientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Id do Paciente</FormLabel>
                            <FormControl>
                              <Input placeholder="ID" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <Calendar className="inline w-4 h-4 mr-2" />
                              Data da Solicitação
                            </FormLabel>
                            <FormControl>
                              <Input type="date" {...field} required />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Dentist Information Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <FileText className="text-burgundy-500" size={20} />
                      Informações do Dentista
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dentistName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Dentista</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome do profissional" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="clinicName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da Clínica</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome da clínica odontológica" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <Phone className="inline w-4 h-4 mr-2" />
                              Telefone
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="(00) 00000-0000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <Mail className="inline w-4 h-4 mr-2" />
                              E-mail
                            </FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="email@exemplo.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>
                              <MapPin className="inline w-4 h-4 mr-2" />
                              Endereço
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Endereço completo da clínica" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Tooth Selection */}
                <ToothSelection onSelectionChange={setToothConfigs} />

                {/* Technical Configuration */}
                <ToothConfiguration 
                  color={color}
                  deliveryDeadline={deliveryDeadline}
                  onColorChange={setColor}
                  onDeliveryDeadlineChange={setDeliveryDeadline}
                />

                {/* File Upload Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Upload className="text-burgundy-500" size={20} />
                      Arquivos e Documentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Foto do Sorriso</label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleSmilePhotoChange}
                          className="cursor-pointer"
                        />
                        {smilePhoto && (
                          <p className="text-sm text-green-600">✓ {smilePhoto.name}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Arquivo do Escaneamento</label>
                        <Input
                          type="file"
                          onChange={handleScanFileChange}
                          className="cursor-pointer"
                        />
                        {scanFile && (
                          <p className="text-sm text-green-600">✓ {scanFile.name}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle>Observações Adicionais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="additionalNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Informações complementares sobre o caso..."
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="flex flex-col items-center gap-4">
                  {isSubmitting && (
                    <div className="w-full max-w-md space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-sm text-center text-muted-foreground">
                        {uploadMessage}
                      </p>
                    </div>
                  )}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full md:w-auto bg-burgundy-500 hover:bg-burgundy-600 text-white px-12"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar Ordem de Serviço"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="lista-pedidos">
            <OrdersList />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-600 text-sm">
            © 2024 Laboratório Odontológico. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
