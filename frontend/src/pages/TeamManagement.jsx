import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Users,
  Save,
  X,
  Shield,
  UserCheck,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function TeamManagement() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamCount, setTeamCount] = useState({ total: 0, staff: 0, admin: 0, max_users: 15, max_staff: 10, can_add_more: true, plan_name: "Plan Enterprise" });
  const [showDialog, setShowDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [loading, setLoading] = useState(false);

  // PROTECCIÓN: Solo ADMIN puede acceder
  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "super_admin") {
      toast.error("Acceso denegado: Solo el dueño de la tienda puede gestionar el equipo");
      window.location.href = "/";
    }
  }, [user]);

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "super_admin")) {
      loadTeamMembers();
      loadTeamCount();
    }
  }, [user]);

  const loadTeamMembers = async () => {
    try {
      const response = await axios.get(`${API}/team/members`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setTeamMembers(response.data);
    } catch (error) {
      console.error("Error loading team members:", error);
      toast.error("Error al cargar el equipo");
    }
  };

  const loadTeamCount = async () => {
    try {
      const response = await axios.get(`${API}/team/count`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setTeamCount(response.data);
    } catch (error) {
      console.error("Error loading team count:", error);
    }
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingMember.id && !editingMember.id.includes('new-')) {
        // Update existing
        await axios.put(`${API}/team/members/${editingMember.id}`, {
          username: editingMember.username,
          email: editingMember.email,
          is_active: editingMember.is_active !== false
        }, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success("Miembro actualizado correctamente");
      } else {
        // Create new
        await axios.post(`${API}/team/members`, {
          username: editingMember.username,
          password: editingMember.password,
          role: "staff"
        }, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success("Miembro creado correctamente");
      }

      loadTeamMembers();
      loadTeamCount();
      setShowDialog(false);
      setEditingMember(null);
    } catch (error) {
      console.error("Error saving member:", error);
      toast.error(error.response?.data?.detail || "Error al guardar miembro");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este miembro del equipo?")) return;

    try {
      await axios.delete(`${API}/team/members/${memberId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Miembro eliminado correctamente");
      loadTeamMembers();
      loadTeamCount();
    } catch (error) {
      console.error("Error deleting member:", error);
      toast.error(error.response?.data?.detail || "Error al eliminar miembro");
    }
  };

  const openDialog = (member = null) => {
    setEditingMember(member || {
      id: `new-${Date.now()}`,
      username: '',
      password: '',
      email: '',
      role: 'staff',
      is_active: true
    });
    setShowDialog(true);
  };

  // Si no es admin, mostrar mensaje de acceso denegado
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Acceso Restringido
            </h3>
            <p className="text-slate-600 mb-6">
              Solo el dueño de la tienda puede gestionar el equipo.
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Equipo</h1>
          <p className="text-slate-600 mt-1">
            Administra los usuarios con acceso a tu tienda
          </p>
        </div>
        <Button 
          onClick={() => openDialog()} 
          className="bg-blue-600 hover:bg-blue-700"
          disabled={!teamCount.can_add_more}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Empleado
        </Button>
      </div>

      {/* Team Count Info */}
      <Card className={teamCount.can_add_more ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}>
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className={`h-6 w-6 ${teamCount.can_add_more ? "text-blue-600" : "text-amber-600"}`} />
            <div>
              <p className="font-semibold text-slate-900">
                {teamCount.total} / {teamCount.max_users} empleados
              </p>
              <p className="text-sm text-slate-600">
                {teamCount.can_add_more 
                  ? `Puedes añadir ${teamCount.max_users - teamCount.total} empleados más` 
                  : "Has alcanzado el límite de empleados"
                }
              </p>
            </div>
          </div>
          {!teamCount.can_add_more && (
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          )}
        </CardContent>
      </Card>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Miembros del Equipo ({teamMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMembers.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                No hay miembros en el equipo. ¡Añade el primero!
              </p>
            ) : (
              teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${
                      member.role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      {member.role === 'admin' ? (
                        <Shield className="h-5 w-5 text-purple-600" />
                      ) : (
                        <UserCheck className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{member.username}</h3>
                      <p className="text-sm text-slate-600">{member.email || member.username}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className={`px-2 py-0.5 rounded ${
                          member.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {member.role === 'admin' ? 'Administrador' : 'Empleado'}
                        </span>
                        <span className={member.is_active !== false ? "text-emerald-600" : "text-red-600"}>
                          {member.is_active !== false ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* Permitir a todos editar su propio perfil o a staff */}
                    {(member.id === user?.userId || member.role === 'staff') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(member)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Solo permitir eliminar usuarios staff (no admin/super_admin) */}
                    {member.role !== 'admin' && member.role !== 'super_admin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMember(member.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Member Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveMember}>
            <DialogHeader>
              <DialogTitle>
                {editingMember?.id?.includes('new-') ? 'Nuevo Empleado' : 'Editar Empleado'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="username">Nombre de Usuario *</Label>
                <Input
                  id="username"
                  value={editingMember?.username || ''}
                  onChange={(e) => setEditingMember({...editingMember, username: e.target.value})}
                  placeholder="usuario123"
                  required
                  disabled={editingMember?.id && !editingMember.id.includes('new-')}
                />
              </div>

              {editingMember?.id?.includes('new-') && (
                <div>
                  <Label htmlFor="password">Contraseña *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={editingMember?.password || ''}
                    onChange={(e) => setEditingMember({...editingMember, password: e.target.value})}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres</p>
                </div>
              )}

              {!editingMember?.id?.includes('new-') && (
                <div>
                  <Label htmlFor="password">Nueva Contraseña (opcional)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={editingMember?.password || ''}
                    onChange={(e) => setEditingMember({...editingMember, password: e.target.value})}
                    placeholder="Dejar vacío para mantener la actual"
                    minLength={6}
                  />
                  <p className="text-xs text-slate-500 mt-1">Solo completar si deseas cambiar la contraseña</p>
                </div>
              )}

              <div>
                <Label htmlFor="email">Email (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingMember?.email || ''}
                  onChange={(e) => setEditingMember({...editingMember, email: e.target.value})}
                  placeholder="email@ejemplo.com"
                />
              </div>

              {!editingMember?.id?.includes('new-') && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={editingMember?.is_active !== false}
                    onChange={(e) => setEditingMember({...editingMember, is_active: e.target.checked})}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">Usuario activo</Label>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
