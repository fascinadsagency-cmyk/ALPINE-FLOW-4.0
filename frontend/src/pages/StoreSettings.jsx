import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Store, Upload, ArrowLeft, Save, Loader2, Building2, Image as ImageIcon, FileText, Activity } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

const API = process.env.REACT_APP_BACKEND_URL;

export default function StoreSettings() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const [storeData, setStoreData] = useState({
    name: "",
    status: "active",
    plan: "basic",
    contact_email: "",
    contact_phone: "",
    address: "",
    company_logo: "",
    ticket_footer: "",
    max_users: 10,
    max_items: 10000,
    max_customers: 10000
  });

  useEffect(() => {
    loadStoreData();
  }, [storeId]);

  const loadStoreData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/stores/${storeId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const store = response.data;
      setStoreData({
        name: store.name,
        status: store.status,
        plan: store.plan,
        contact_email: store.contact?.email || "",
        contact_phone: store.contact?.phone || "",
        address: store.contact?.address || "",
        company_logo: store.company_logo || "",
        ticket_footer: store.ticket_footer || "",
        max_users: store.settings?.max_users || 10,
        max_items: store.settings?.max_items || 10000,
        max_customers: store.settings?.max_customers || 10000
      });
    } catch (error) {
      toast.error("Error al cargar datos de la tienda");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/stores/${storeId}`, {
        name: storeData.name,
        status: storeData.status,
        plan: storeData.plan,
        contact_email: storeData.contact_email,
        contact_phone: storeData.contact_phone,
        address: storeData.address,
        company_logo: storeData.company_logo,
        ticket_footer: storeData.ticket_footer,
        max_users: storeData.max_users,
        max_items: storeData.max_items,
        max_customers: storeData.max_customers
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Cambios guardados exitosamente");
      navigate('/tiendas');
    } catch (error) {
      toast.error("Error al guardar cambios");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen es demasiado grande. Máximo 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      // Compress image
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 500;
        const maxHeight = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setStoreData({ ...storeData, company_logo: compressedBase64 });
        toast.success("Logo cargado correctamente");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleImpersonate = async () => {
    try {
      const response = await axios.post(`${API}/api/stores/${storeId}/impersonate`, {}, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Save new token
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('impersonating', 'true');
      localStorage.setItem('original_token', localStorage.getItem('token'));
      
      toast.success(`Accediendo como ${storeData.name}...`);
      
      // Reload to apply new context
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      toast.error("Error al acceder como esta tienda");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`p-6 lg:p-8 space-y-6 min-h-screen ${darkMode ? 'bg-[#121212]' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/tiendas')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <Store className="inline-block h-8 w-8 mr-2" />
              Ajustes de Tienda
            </h1>
            <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              ID: {storeId}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImpersonate}>
            <Building2 className="h-4 w-4 mr-2" />
            Acceder como esta tienda
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Cambios
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Basic Info */}
        <div className="space-y-6">
          <Card className={darkMode ? 'bg-[#1a1a1a] border-[#333]' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Información Básica
              </CardTitle>
              <CardDescription>Datos principales de la tienda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre de la Tienda</Label>
                <Input
                  value={storeData.name}
                  onChange={(e) => setStoreData({ ...storeData, name: e.target.value })}
                  placeholder="Nombre de la tienda"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={storeData.status} onValueChange={(val) => setStoreData({ ...storeData, status: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="inactive">Inactiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select value={storeData.plan} onValueChange={(val) => setStoreData({ ...storeData, plan: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email de Contacto</Label>
                <Input
                  type="email"
                  value={storeData.contact_email}
                  onChange={(e) => setStoreData({ ...storeData, contact_email: e.target.value })}
                  placeholder="contacto@tienda.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={storeData.contact_phone}
                  onChange={(e) => setStoreData({ ...storeData, contact_phone: e.target.value })}
                  placeholder="+34 600 000 000"
                />
              </div>

              <div className="space-y-2">
                <Label>Dirección</Label>
                <Textarea
                  value={storeData.address}
                  onChange={(e) => setStoreData({ ...storeData, address: e.target.value })}
                  placeholder="Calle Principal, 123"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Limits Card */}
          <Card className={darkMode ? 'bg-[#1a1a1a] border-[#333]' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Límites del Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Máximo de Usuarios</Label>
                <Input
                  type="number"
                  value={storeData.max_users}
                  onChange={(e) => setStoreData({ ...storeData, max_users: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Máximo de Artículos</Label>
                <Input
                  type="number"
                  value={storeData.max_items}
                  onChange={(e) => setStoreData({ ...storeData, max_items: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Máximo de Clientes</Label>
                <Input
                  type="number"
                  value={storeData.max_customers}
                  onChange={(e) => setStoreData({ ...storeData, max_customers: parseInt(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Logo & Ticket */}
        <div className="space-y-6">
          <Card className={darkMode ? 'bg-[#1a1a1a] border-[#333]' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Logo de la Tienda
              </CardTitle>
              <CardDescription>Aparecerá en los tickets y documentos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {storeData.company_logo && (
                <div className="flex justify-center p-4 border-2 border-dashed rounded-lg">
                  <img
                    src={storeData.company_logo}
                    alt="Logo"
                    className="max-h-40 object-contain"
                  />
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />

              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {storeData.company_logo ? "Cambiar Logo" : "Subir Logo"}
              </Button>

              {storeData.company_logo && (
                <Button
                  variant="destructive"
                  onClick={() => setStoreData({ ...storeData, company_logo: "" })}
                  className="w-full"
                >
                  Eliminar Logo
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className={darkMode ? 'bg-[#1a1a1a] border-[#333]' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pie de Ticket
              </CardTitle>
              <CardDescription>
                Texto que aparece al final de cada ticket (NIF, políticas, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={storeData.ticket_footer}
                onChange={(e) => setStoreData({ ...storeData, ticket_footer: e.target.value })}
                placeholder="NIF: B12345678&#10;Política de devoluciones: 14 días&#10;www.mitienda.com"
                rows={6}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
