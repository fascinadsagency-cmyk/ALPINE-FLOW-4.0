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
import { DollarSign, Save, Loader2, Plus, Package, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ITEM_TYPES = [
  { value: "ski", label: "Esquís" },
  { value: "snowboard", label: "Snowboard" },
  { value: "boots", label: "Botas" },
  { value: "helmet", label: "Casco" },
  { value: "poles", label: "Bastones" },
];

const DEFAULT_TARIFF = {
  days_1: 0,
  days_2_3: 0,
  days_4_7: 0,
  week: 0,
  season: 0
};

export default function Tariffs() {
  const [tariffs, setTariffs] = useState({});
  const [packs, setPacks] = useState([]);
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
      const [tariffsRes, packsRes] = await Promise.all([
        tariffApi.getAll(),
        axios.get(`${API}/packs`).catch(() => ({ data: [] }))
      ]);
      
      const tariffMap = {};
      tariffsRes.data.forEach(t => {
        tariffMap[t.item_type] = t;
      });
      ITEM_TYPES.forEach(type => {
        if (!tariffMap[type.value]) {
          tariffMap[type.value] = { ...DEFAULT_TARIFF, item_type: type.value };
        }
      });
      setTariffs(tariffMap);
      setPacks(packsRes.data || []);
    } catch (error) {
      toast.error("Error al cargar tarifas");
    } finally {
      setLoading(false);
    }
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
      for (const itemType of ITEM_TYPES.map(t => t.value)) {
        await tariffApi.create({
          item_type: itemType,
          ...tariffs[itemType]
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
      toast.success(editingPack ? "Pack actualizado" : "Pack creado correctamente");
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
      MEDIA: "bg-emerald-100 text-emerald-700 border-emerald-300"
    };
    return badges[category] || badges.MEDIA;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      SUPERIOR: "🟣",
      ALTA: "🔵",
      MEDIA: "🟢"
    };
    return icons[category] || icons.MEDIA;
  };
      return;
    }

    try {
      await axios.post(`${API}/packs`, {
        name: newPack.name,
        description: newPack.description,
        items: newPack.items,
        price_1_day: parseFloat(newPack.price_1_day) || 0,
        price_2_3_days: parseFloat(newPack.price_2_3_days) || 0,
        price_4_7_days: parseFloat(newPack.price_4_7_days) || 0,
        price_week: parseFloat(newPack.price_week) || 0
      });
      
      toast.success("Pack creado correctamente");
      setShowPackDialog(false);
      setNewPack({
        name: "",
        description: "",
        price_1_day: "",
        price_2_3_days: "",
        price_4_7_days: "",
        price_week: "",
        items: []
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al crear pack");
    }
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
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-slate-500" />
                Precios por Tipo de Artículo (€)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Tipo</TableHead>
                      <TableHead>1 día</TableHead>
                      <TableHead>2-3 días</TableHead>
                      <TableHead>4-7 días</TableHead>
                      <TableHead>Semana</TableHead>
                      <TableHead>Temporada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ITEM_TYPES.map((type) => (
                      <TableRow key={type.value}>
                        <TableCell className="font-medium">{type.label}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={tariffs[type.value]?.days_1 || ""}
                            onChange={(e) => updateTariff(type.value, "days_1", e.target.value)}
                            className="w-24 h-10"
                            data-testid={`tariff-${type.value}-1`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={tariffs[type.value]?.days_2_3 || ""}
                            onChange={(e) => updateTariff(type.value, "days_2_3", e.target.value)}
                            className="w-24 h-10"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={tariffs[type.value]?.days_4_7 || ""}
                            onChange={(e) => updateTariff(type.value, "days_4_7", e.target.value)}
                            className="w-24 h-10"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={tariffs[type.value]?.week || ""}
                            onChange={(e) => updateTariff(type.value, "week", e.target.value)}
                            className="w-24 h-10"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={tariffs[type.value]?.season || ""}
                            onChange={(e) => updateTariff(type.value, "season", e.target.value)}
                            className="w-24 h-10"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">{pack.name}</h3>
                            {pack.description && (
                              <p className="text-sm text-slate-500 mt-1">{pack.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deletePack(pack.id)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {pack.items?.map(item => (
                            <Badge key={item} variant="outline">
                              {ITEM_TYPES.find(t => t.value === item)?.label || item}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-slate-500">1 día:</span>
                              <span className="ml-1 font-semibold">€{pack.price_1_day}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">2-3 días:</span>
                              <span className="ml-1 font-semibold">€{pack.price_2_3_days}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">4-7 días:</span>
                              <span className="ml-1 font-semibold">€{pack.price_4_7_days}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Semana:</span>
                              <span className="ml-1 font-semibold">€{pack.price_week}</span>
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

      {/* Create Pack Dialog */}
      <Dialog open={showPackDialog} onOpenChange={setShowPackDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Pack / Combo</DialogTitle>
            <DialogDescription>
              Define un pack con precio especial para varios artículos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
                    {ITEM_TYPES.filter(t => !newPack.items.includes(t.value)).map(type => (
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
                      {ITEM_TYPES.find(t => t.value === item)?.label}
                      <button onClick={() => removeItemFromPack(item)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {individualPrice > 0 && (
                <p className="text-sm text-slate-500 mt-2">
                  Precio individual total: €{individualPrice.toFixed(2)}/día
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Precio 1 día (€)</Label>
                <Input
                  type="number"
                  value={newPack.price_1_day}
                  onChange={(e) => setNewPack({ ...newPack, price_1_day: e.target.value })}
                  placeholder={individualPrice > 0 ? (individualPrice * 0.9).toFixed(0) : "0"}
                  className="h-11 mt-1"
                />
              </div>
              <div>
                <Label>Precio 2-3 días (€)</Label>
                <Input
                  type="number"
                  value={newPack.price_2_3_days}
                  onChange={(e) => setNewPack({ ...newPack, price_2_3_days: e.target.value })}
                  className="h-11 mt-1"
                />
              </div>
              <div>
                <Label>Precio 4-7 días (€)</Label>
                <Input
                  type="number"
                  value={newPack.price_4_7_days}
                  onChange={(e) => setNewPack({ ...newPack, price_4_7_days: e.target.value })}
                  className="h-11 mt-1"
                />
              </div>
              <div>
                <Label>Precio Semana (€)</Label>
                <Input
                  type="number"
                  value={newPack.price_week}
                  onChange={(e) => setNewPack({ ...newPack, price_week: e.target.value })}
                  className="h-11 mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPackDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={createPack}>
              Crear Pack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
