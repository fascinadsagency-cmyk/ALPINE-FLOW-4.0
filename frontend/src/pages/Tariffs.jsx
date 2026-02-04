import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tariffApi } from "@/lib/api";
import { DollarSign, Save, Loader2, Plus, Package, Trash2, X, Edit2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Default item types (fallback if API fails)
// Default item types - will be replaced with custom types from API
const DEFAULT_ITEM_TYPES = [];

// Default tariff structure for new item types
const DEFAULT_TARIFF = {
  day_1: 0, day_2: 0, day_3: 0, day_4: 0, day_5: 0,
  day_6: 0, day_7: 0, day_8: 0, day_9: 0, day_10: 0,
  day_11_plus: 0
};

export default function Tariffs() {
  const [tariffs, setTariffs] = useState({});
  const [packs, setPacks] = useState([]);
  const [itemTypes, setItemTypes] = useState(DEFAULT_ITEM_TYPES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPackDialog, setShowPackDialog] = useState(false);
  const [editingPack, setEditingPack] = useState(null);
  const [deletingPack, setDeletingPack] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newPack, setNewPack] = useState({
    name: "",
    description: "",
    category: "MEDIA",
    day_1: "",
    day_2: "",
    day_3: "",
    day_4: "",
    day_5: "",
    day_6: "",
    day_7: "",
    day_8: "",
    day_9: "",
    day_10: "",
    day_11_plus: "",
    items: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tariffsRes, packsRes, itemTypesRes] = await Promise.all([
        tariffApi.getAll(),
        axios.get(`${API}/packs`).catch(() => ({ data: [] })),
        axios.get(`${API}/item-types`).catch(() => ({ data: [] }))
      ]);
      
      // Load dynamic item types
      const loadedTypes = itemTypesRes.data || [];
      setItemTypes(loadedTypes);
      
      // Get valid type values for orphan detection
      const validTypeValues = new Set(loadedTypes.map(t => t.value));
      
      // Build tariff map - ONLY from database, no auto-creation
      const tariffMap = {};
      const orphanedTariffs = [];
      
      tariffsRes.data.forEach(t => {
        tariffMap[t.item_type] = t;
        // Check if this tariff's item_type still exists
        if (!validTypeValues.has(t.item_type)) {
          orphanedTariffs.push(t.item_type);
        }
      });
      
      // Create empty tariffs for types that don't have one yet
      loadedTypes.forEach(type => {
        if (!tariffMap[type.value]) {
          tariffMap[type.value] = { ...DEFAULT_TARIFF, item_type: type.value, isNew: true };
        }
      });
      
      setTariffs(tariffMap);
      setPacks(packsRes.data || []);
      
      // Log orphaned tariffs for cleanup
      if (orphanedTariffs.length > 0) {
        console.log('Tarifas huérfanas detectadas:', orphanedTariffs);
      }
    } catch (error) {
      toast.error("Error al cargar tarifas");
    } finally {
      setLoading(false);
    }
  };

  // Delete a tariff from the database
  const deleteTariff = async (itemType) => {
    try {
      await axios.delete(`${API}/tariffs/${encodeURIComponent(itemType)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Remove from local state
      const newTariffs = { ...tariffs };
      delete newTariffs[itemType];
      setTariffs(newTariffs);
      
      toast.success(`Tarifa "${itemType}" eliminada`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al eliminar tarifa");
    }
  };

  // Get all tariff keys (including orphaned ones)
  const getAllTariffTypes = () => {
    const allTypes = new Set([
      ...itemTypes.map(t => t.value),
      ...Object.keys(tariffs)
    ]);
    return Array.from(allTypes);
  };

  // Check if a tariff type is orphaned (no matching item type)
  const isOrphanedTariff = (tariffType) => {
    return !itemTypes.some(t => t.value === tariffType);
  };

  const updateTariff = (itemType, field, value) => {
    setTariffs({
      ...tariffs,
      [itemType]: {
        ...tariffs[itemType],
        [field]: parseFloat(value) || 0
      }
    });
  };

  const saveTariffs = async () => {
    setSaving(true);
    try {
      for (const type of itemTypes) {
        await tariffApi.create({
          item_type: type.value,
          ...tariffs[type.value]
        });
      }
      toast.success("Tarifas guardadas correctamente");
    } catch (error) {
      toast.error("Error al guardar tarifas");
    } finally {
      setSaving(false);
    }
  };

  const addItemToPack = (itemType) => {
    if (!itemType || newPack.items.includes(itemType)) return;
    setNewPack({
      ...newPack,
      items: [...newPack.items, itemType]
    });
  };

  const removeItemFromPack = (itemType) => {
    setNewPack({
      ...newPack,
      items: newPack.items.filter(i => i !== itemType)
    });
  };

  const calculatePackIndividualPrice = () => {
    let total = 0;
    newPack.items.forEach(itemType => {
      const tariff = tariffs[itemType];
      if (tariff) {
        total += tariff.days_1 || 0;
      }
    });
    return total;
  };

  // Helper to get item label from dynamic types
  const getItemLabel = (value) => {
    const found = itemTypes.find(t => t.value === value);
    return found ? found.label : value;
  };

  const createPack = async () => {
    if (!newPack.name || newPack.items.length === 0) {
      toast.error("Nombre y al menos un artículo son obligatorios");
      return;
    }

    try {
      await axios.post(`${API}/packs`, {
        name: newPack.name,
        description: newPack.description,
        category: newPack.category,
        items: newPack.items,
        day_1: parseFloat(newPack.day_1) || 0,
        day_2: parseFloat(newPack.day_2) || 0,
        day_3: parseFloat(newPack.day_3) || 0,
        day_4: parseFloat(newPack.day_4) || 0,
        day_5: parseFloat(newPack.day_5) || 0,
        day_6: parseFloat(newPack.day_6) || 0,
        day_7: parseFloat(newPack.day_7) || 0,
        day_8: parseFloat(newPack.day_8) || 0,
        day_9: parseFloat(newPack.day_9) || 0,
        day_10: parseFloat(newPack.day_10) || 0,
        day_11_plus: parseFloat(newPack.day_11_plus) || 0
      });
      toast.success("Pack creado correctamente");
      setShowPackDialog(false);
      setEditingPack(null);
      setNewPack({
        name: "",
        description: "",
        category: "MEDIA",
        day_1: "", day_2: "", day_3: "", day_4: "", day_5: "",
        day_6: "", day_7: "", day_8: "", day_9: "", day_10: "",
        day_11_plus: "",
        items: []
      });
      loadData();
    } catch (error) {
      toast.error("Error al crear pack");
    }
  };

  const updatePack = async () => {
    if (!newPack.name || newPack.items.length === 0) {
      toast.error("Nombre y al menos un artículo son obligatorios");
      return;
    }

    try {
      await axios.put(`${API}/packs/${editingPack.id}`, {
        name: newPack.name,
        description: newPack.description,
        category: newPack.category,
        items: newPack.items,
        day_1: parseFloat(newPack.day_1) || 0,
        day_2: parseFloat(newPack.day_2) || 0,
        day_3: parseFloat(newPack.day_3) || 0,
        day_4: parseFloat(newPack.day_4) || 0,
        day_5: parseFloat(newPack.day_5) || 0,
        day_6: parseFloat(newPack.day_6) || 0,
        day_7: parseFloat(newPack.day_7) || 0,
        day_8: parseFloat(newPack.day_8) || 0,
        day_9: parseFloat(newPack.day_9) || 0,
        day_10: parseFloat(newPack.day_10) || 0,
        day_11_plus: parseFloat(newPack.day_11_plus) || 0
      });
      toast.success("Pack actualizado correctamente");
      setShowPackDialog(false);
      setEditingPack(null);
      setNewPack({
        name: "",
        description: "",
        category: "MEDIA",
        day_1: "", day_2: "", day_3: "", day_4: "", day_5: "",
        day_6: "", day_7: "", day_8: "", day_9: "", day_10: "",
        day_11_plus: "",
        items: []
      });
      loadData();
    } catch (error) {
      toast.error("Error al actualizar pack");
    }
  };

  const openEditPack = (pack) => {
    setEditingPack(pack);
    setNewPack({
      name: pack.name,
      description: pack.description || "",
      category: pack.category || "MEDIA",
      day_1: pack.day_1?.toString() || "",
      day_2: pack.day_2?.toString() || "",
      day_3: pack.day_3?.toString() || "",
      day_4: pack.day_4?.toString() || "",
      day_5: pack.day_5?.toString() || "",
      day_6: pack.day_6?.toString() || "",
      day_7: pack.day_7?.toString() || "",
      day_8: pack.day_8?.toString() || "",
      day_9: pack.day_9?.toString() || "",
      day_10: pack.day_10?.toString() || "",
      day_11_plus: pack.day_11_plus?.toString() || "",
      items: pack.items || []
    });
    setShowPackDialog(true);
  };

  const openDeletePack = (pack) => {
    setDeletingPack(pack);
    setShowDeleteDialog(true);
  };

  const getCategoryBadge = (category) => {
    const badges = {
      SUPERIOR: "bg-purple-100 text-purple-700 border-purple-300",
      ALTA: "bg-blue-100 text-blue-700 border-blue-300",
      MEDIA: "bg-emerald-100 text-emerald-700 border-emerald-300",
      OTRO: "bg-slate-100 text-slate-700 border-slate-300"
    };
    return badges[category] || badges.MEDIA;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      SUPERIOR: "🟣",
      ALTA: "🔵",
      MEDIA: "🟢",
      OTRO: "⚪"
    };
    return icons[category] || icons.MEDIA;
  };

  const deletePack = async () => {
    try {
      await axios.delete(`${API}/packs/${deletingPack.id}`);
      toast.success("Pack eliminado");
      setShowDeleteDialog(false);
      setDeletingPack(null);
      loadData();
    } catch (error) {
      toast.error("Error al eliminar pack");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const individualPrice = calculatePackIndividualPrice();

  return (
    <div className="p-6 lg:p-8" data-testid="tariffs-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Tarifas
          </h1>
          <p className="text-slate-500 mt-1">Configura precios individuales y packs</p>
        </div>
        <Button onClick={saveTariffs} disabled={saving} data-testid="save-tariffs-btn">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>

      <Tabs defaultValue="packs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="packs">Packs / Combos</TabsTrigger>
          <TabsTrigger value="individual">Precios Individuales</TabsTrigger>
        </TabsList>

        {/* Individual Prices */}
        <TabsContent value="individual">
          <div className="space-y-6">
            {/* Daily Pricing (Detailed) */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-slate-500" />
                  Precios Diarios Detallados (Días 1-10 + 11+)
                </CardTitle>
                <p className="text-sm text-slate-500 mt-2">
                  Configura precios específicos para cada uno de los primeros 10 días
                </p>
              </CardHeader>
              <CardContent>
                {/* Tarifas de tipos existentes */}
                {itemTypes.map((type) => (
                  <div key={type.value} className="mb-6 last:mb-0 p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-900">{type.label}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTariff(type.value)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Eliminar tarifa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((day) => (
                        <div key={day}>
                          <Label className="text-xs text-slate-500">Día {day}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={tariffs[type.value]?.[`day_${day}`] || ""}
                            onChange={(e) => updateTariff(type.value, `day_${day}`, e.target.value)}
                            className="w-full h-9 mt-1"
                            data-testid={`tariff-${type.value}-day-${day}`}
                          />
                        </div>
                      ))}
                      <div>
                        <Label className="text-xs text-slate-500">Día 11+</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={tariffs[type.value]?.day_11_plus || ""}
                          onChange={(e) => updateTariff(type.value, "day_11_plus", e.target.value)}
                          className="w-full h-9 mt-1"
                          data-testid={`tariff-${type.value}-day-11plus`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Tarifas huérfanas (sin tipo de item correspondiente) */}
                {Object.keys(tariffs).filter(key => isOrphanedTariff(key)).length > 0 && (
                  <div className="mt-8 border-t pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <h3 className="font-semibold text-amber-700">Tarifas Obsoletas (sin tipo de artículo)</h3>
                    </div>
                    <p className="text-sm text-amber-600 mb-4">
                      Estas tarifas pertenecen a tipos de artículos que ya no existen. Puedes eliminarlas.
                    </p>
                    {Object.keys(tariffs).filter(key => isOrphanedTariff(key)).map((tariffKey) => (
                      <div key={tariffKey} className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                              OBSOLETA
                            </Badge>
                            <h4 className="font-semibold text-amber-900">{tariffKey}</h4>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteTariff(tariffKey)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </Button>
                        </div>
                        <div className="grid grid-cols-6 gap-2 text-sm text-amber-700">
                          {[1, 2, 3, 4, 5, 6].map((day) => (
                            <div key={day}>
                              Día {day}: €{tariffs[tariffKey]?.[`day_${day}`] || 0}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Packs */}
        <TabsContent value="packs">
          <Card className="border-slate-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-slate-500" />
                Packs / Combos
              </CardTitle>
              <Button onClick={() => setShowPackDialog(true)} data-testid="create-pack-btn">
                <Plus className="h-4 w-4 mr-2" />
                Crear Pack
              </Button>
            </CardHeader>
            <CardContent>
              {packs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay packs creados</p>
                  <p className="text-sm mt-1">Crea combos con descuento para grupos y familias</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {packs.map((pack) => (
                    <Card key={pack.id} className="border-slate-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{getCategoryIcon(pack.category)}</span>
                              <h3 className="font-semibold text-slate-900">{pack.name}</h3>
                            </div>
                            <Badge className={getCategoryBadge(pack.category)}>
                              Gama {pack.category}
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditPack(pack)}
                              className="h-8 w-8"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeletePack(pack)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {pack.description && (
                          <p className="text-sm text-slate-500 mt-2">{pack.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-3">
                          {pack.items?.map(item => (
                            <Badge key={item} variant="outline">
                              {getItemLabel(item)}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-slate-500">Día 1-2:</span>
                              <span className="ml-1 font-semibold">€{pack.day_1 || 0} / €{pack.day_2 || 0}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Día 3-5:</span>
                              <span className="ml-1 font-semibold">€{pack.day_3 || 0} - €{pack.day_5 || 0}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Día 6-10:</span>
                              <span className="ml-1 font-semibold">€{pack.day_6 || 0} - €{pack.day_10 || 0}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Día 11+:</span>
                              <span className="ml-1 font-semibold">€{pack.day_11_plus || 0}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Pack Dialog */}
      <Dialog open={showPackDialog} onOpenChange={() => {
        setShowPackDialog(false);
        setEditingPack(null);
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPack ? "Editar Pack" : "Crear Pack / Combo"}</DialogTitle>
            <DialogDescription>
              Define un pack con precios por día
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre del Pack *</Label>
                <Input
                  value={newPack.name}
                  onChange={(e) => setNewPack({ ...newPack, name: e.target.value })}
                  placeholder="Ej: Pack Ski Completo"
                  className="h-11 mt-1"
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <Select 
                  value={newPack.category} 
                  onValueChange={(v) => setNewPack({ ...newPack, category: v })}
                >
                  <SelectTrigger className="h-11 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPERIOR">🟣 Gama Superior</SelectItem>
                    <SelectItem value="ALTA">🔵 Gama Alta</SelectItem>
                    <SelectItem value="MEDIA">🟢 Gama Media</SelectItem>
                    <SelectItem value="OTRO">⚪ Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Descripción</Label>
              <Input
                value={newPack.description}
                onChange={(e) => setNewPack({ ...newPack, description: e.target.value })}
                placeholder="Ej: Ideal para principiantes"
                className="h-11 mt-1"
              />
            </div>

            <div>
              <Label>Artículos incluidos *</Label>
              <div className="flex gap-2 mt-1">
                <Select onValueChange={addItemToPack}>
                  <SelectTrigger className="h-11 flex-1">
                    <SelectValue placeholder="Añadir artículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {itemTypes.filter(t => !newPack.items.includes(t.value)).map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newPack.items.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newPack.items.map(item => (
                    <Badge key={item} variant="secondary" className="flex items-center gap-1 py-1">
                      {getItemLabel(item)}
                      <button onClick={() => removeItemFromPack(item)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-base font-semibold">Precios por Día (€)</Label>
              <div className="grid grid-cols-5 gap-3 mt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(day => (
                  <div key={day}>
                    <Label className="text-xs text-slate-500">Día {day}</Label>
                    <Input
                      type="number"
                      value={newPack[`day_${day}`]}
                      onChange={(e) => setNewPack({ ...newPack, [`day_${day}`]: e.target.value })}
                      className="h-9 mt-1"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Precio Día 11+ (€)</Label>
              <Input
                type="number"
                value={newPack.day_11_plus}
                onChange={(e) => setNewPack({ ...newPack, day_11_plus: e.target.value })}
                className="h-11 mt-1"
                placeholder="Precio para día 11 en adelante"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPackDialog(false);
              setEditingPack(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={editingPack ? updatePack : createPack}>
              {editingPack ? "Actualizar" : "Crear"} Pack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Pack Confirmation */}
      {deletingPack && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Eliminar Pack</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que quieres eliminar este pack?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="font-medium text-slate-900">{deletingPack.name}</p>
                <Badge className={`${getCategoryBadge(deletingPack.category)} mt-2`}>
                  {getCategoryIcon(deletingPack.category)} Gama {deletingPack.category}
                </Badge>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={deletePack}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
