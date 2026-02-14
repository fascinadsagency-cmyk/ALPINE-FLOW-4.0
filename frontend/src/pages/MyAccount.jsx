import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { 
  User, 
  Mail, 
  Lock, 
  Save, 
  Loader2,
  Camera,
  Shield,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MyAccount() {
  const { user, logout, updateUser } = useAuth();
  const { darkMode, t } = useSettings();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  const [profileData, setProfileData] = useState({
    username: "",
    email: "",
    photo_url: ""
  });
  
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  
  const [passwordErrors, setPasswordErrors] = useState({});

  // Cargar datos del perfil al montar el componente
  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfileData({
        username: response.data.username || "",
        email: response.data.email || response.data.username || "",
        photo_url: response.data.photo_url || ""
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Error al cargar el perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    
    // Limpiar errores al escribir
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validatePassword = () => {
    const errors = {};
    
    if (!passwordData.current_password) {
      errors.current_password = "La contraseña actual es obligatoria";
    }
    
    if (!passwordData.new_password) {
      errors.new_password = "La nueva contraseña es obligatoria";
    } else if (passwordData.new_password.length < 6) {
      errors.new_password = "La contraseña debe tener al menos 6 caracteres";
    }
    
    if (!passwordData.confirm_password) {
      errors.confirm_password = "Confirma la nueva contraseña";
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = "Las contraseñas no coinciden";
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/auth/profile`, {
        username: profileData.username,
        email: profileData.email
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Perfil actualizado correctamente");
      
      // Si cambió el email/username, mostrar diálogo de relogin
      if (profileData.email !== user?.email || profileData.username !== user?.username) {
        setShowLogoutDialog(true);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(error.response?.data?.detail || "Error al guardar el perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!validatePassword()) return;
    
    setSavingPassword(true);
    
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/auth/password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Contraseña actualizada correctamente");
      
      // Limpiar formulario
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: ""
      });
      
      // Solicitar nuevo inicio de sesión
      setShowLogoutDialog(true);
    } catch (error) {
      console.error("Error changing password:", error);
      
      if (error.response?.status === 401) {
        setPasswordErrors({ current_password: "La contraseña actual es incorrecta" });
      } else {
        toast.error(error.response?.data?.detail || "Error al cambiar la contraseña");
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    
    // Validar tamaño (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no puede superar 2MB");
      return;
    }
    
    setUploadingPhoto(true);
    
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("photo", file);
      
      const response = await axios.post(`${API}/auth/photo`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      
      setProfileData(prev => ({ ...prev, photo_url: response.data.photo_url }));
      updateUser({ photo_url: response.data.photo_url });
      toast.success("Foto actualizada correctamente");
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error(error.response?.data?.detail || "Error al subir la foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogoutAndRelogin = () => {
    setShowLogoutDialog(false);
    logout();
    navigate("/login");
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`p-6 max-w-4xl mx-auto ${darkMode ? 'text-white' : ''}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Mi Cuenta
        </h1>
        <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Gestiona tu información personal y credenciales de acceso
        </p>
      </div>

      <div className="grid gap-6">
        {/* Foto de Perfil */}
        <Card className={darkMode ? 'bg-slate-800 border-slate-700' : ''}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
              <Camera className="h-5 w-5" />
              Foto de Perfil
            </CardTitle>
            <CardDescription className={darkMode ? 'text-slate-400' : ''}>
              Tu foto se mostrará en tu perfil y comentarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profileData.photo_url} alt={profileData.username} />
                <AvatarFallback className="text-2xl bg-primary text-white">
                  {getInitials(profileData.username)}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <Label 
                  htmlFor="photo-upload" 
                  className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    darkMode 
                      ? 'border-slate-600 hover:bg-slate-700 text-white' 
                      : 'border-slate-300 hover:bg-slate-50'
                  } transition-colors`}
                >
                  {uploadingPhoto ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {uploadingPhoto ? "Subiendo..." : "Cambiar foto"}
                </Label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  data-testid="photo-upload-input"
                />
                <p className={`mt-2 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  JPG, PNG o GIF. Máximo 2MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Personal */}
        <Card className={darkMode ? 'bg-slate-800 border-slate-700' : ''}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
            <CardDescription className={darkMode ? 'text-slate-400' : ''}>
              Actualiza tu nombre y correo electrónico
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username" className={darkMode ? 'text-slate-300' : ''}>
                    Nombre de Usuario
                  </Label>
                  <div className="relative">
                    <User className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    <Input
                      id="username"
                      name="username"
                      value={profileData.username}
                      onChange={handleProfileChange}
                      className={`pl-10 ${darkMode ? 'bg-slate-900 border-slate-600 text-white' : ''}`}
                      placeholder="Tu nombre"
                      data-testid="profile-username-input"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className={darkMode ? 'text-slate-300' : ''}>
                    Correo Electrónico
                  </Label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      className={`pl-10 ${darkMode ? 'bg-slate-900 border-slate-600 text-white' : ''}`}
                      placeholder="tu@email.com"
                      data-testid="profile-email-input"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  disabled={savingProfile}
                  className="gap-2"
                  data-testid="save-profile-btn"
                >
                  {savingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingProfile ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Cambiar Contraseña */}
        <Card className={darkMode ? 'bg-slate-800 border-slate-700' : ''}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
              <Shield className="h-5 w-5" />
              Seguridad
            </CardTitle>
            <CardDescription className={darkMode ? 'text-slate-400' : ''}>
              Cambia tu contraseña de acceso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Contraseña Actual */}
              <div className="space-y-2">
                <Label htmlFor="current_password" className={darkMode ? 'text-slate-300' : ''}>
                  Contraseña Actual
                </Label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  <Input
                    id="current_password"
                    name="current_password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.current_password}
                    onChange={handlePasswordChange}
                    className={`pl-10 pr-10 ${darkMode ? 'bg-slate-900 border-slate-600 text-white' : ''} ${passwordErrors.current_password ? 'border-red-500' : ''}`}
                    placeholder="Tu contraseña actual"
                    data-testid="current-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordErrors.current_password && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {passwordErrors.current_password}
                  </p>
                )}
              </div>

              <Separator className={darkMode ? 'bg-slate-700' : ''} />

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Nueva Contraseña */}
                <div className="space-y-2">
                  <Label htmlFor="new_password" className={darkMode ? 'text-slate-300' : ''}>
                    Nueva Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    <Input
                      id="new_password"
                      name="new_password"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.new_password}
                      onChange={handlePasswordChange}
                      className={`pl-10 pr-10 ${darkMode ? 'bg-slate-900 border-slate-600 text-white' : ''} ${passwordErrors.new_password ? 'border-red-500' : ''}`}
                      placeholder="Mínimo 6 caracteres"
                      data-testid="new-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordErrors.new_password && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <X className="h-3 w-3" />
                      {passwordErrors.new_password}
                    </p>
                  )}
                </div>

                {/* Confirmar Contraseña */}
                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className={darkMode ? 'text-slate-300' : ''}>
                    Confirmar Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    <Input
                      id="confirm_password"
                      name="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirm_password}
                      onChange={handlePasswordChange}
                      className={`pl-10 pr-10 ${darkMode ? 'bg-slate-900 border-slate-600 text-white' : ''} ${passwordErrors.confirm_password ? 'border-red-500' : ''}`}
                      placeholder="Repite la nueva contraseña"
                      data-testid="confirm-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordErrors.confirm_password && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <X className="h-3 w-3" />
                      {passwordErrors.confirm_password}
                    </p>
                  )}
                  {passwordData.confirm_password && passwordData.new_password === passwordData.confirm_password && !passwordErrors.confirm_password && (
                    <p className="text-sm text-green-500 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Las contraseñas coinciden
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  disabled={savingPassword}
                  variant="destructive"
                  className="gap-2"
                  data-testid="change-password-btn"
                >
                  {savingPassword ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {savingPassword ? "Cambiando..." : "Cambiar Contraseña"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Información de Cuenta */}
        <Card className={darkMode ? 'bg-slate-800 border-slate-700' : ''}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
              <Shield className="h-5 w-5" />
              Información de Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Rol</p>
                <p className={`font-medium capitalize ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {user?.role === "admin" ? "Administrador" : user?.role === "super_admin" ? "Super Administrador" : user?.role}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>ID de Tienda</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {user?.store_id || "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de Re-login */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-md" data-testid="relogin-dialog">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-center">
              Sesión Actualizada
            </DialogTitle>
            <DialogDescription className="text-center">
              Tus credenciales han sido actualizadas. Por seguridad, necesitas iniciar sesión nuevamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleLogoutAndRelogin} className="gap-2" data-testid="relogin-btn">
              <Lock className="h-4 w-4" />
              Iniciar Sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
