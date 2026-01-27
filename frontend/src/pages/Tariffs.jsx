import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tariffApi } from "@/lib/api";
import { DollarSign, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTariffs();
  }, []);

  const loadTariffs = async () => {
    try {
      const response = await tariffApi.getAll();
      const tariffMap = {};
      response.data.forEach(t => {
        tariffMap[t.item_type] = t;
      });
      // Fill missing types with defaults
      ITEM_TYPES.forEach(type => {
        if (!tariffMap[type.value]) {
          tariffMap[type.value] = { ...DEFAULT_TARIFF, item_type: type.value };
        }
      });
      setTariffs(tariffMap);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8" data-testid="tariffs-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Tarifas
          </h1>
          <p className="text-slate-500 mt-1">Configura los precios por tipo de artículo y duración</p>
        </div>
        <Button onClick={saveTariffs} disabled={saving} data-testid="save-tariffs-btn">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>

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
                        data-testid={`tariff-${type.value}-2-3`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={tariffs[type.value]?.days_4_7 || ""}
                        onChange={(e) => updateTariff(type.value, "days_4_7", e.target.value)}
                        className="w-24 h-10"
                        data-testid={`tariff-${type.value}-4-7`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={tariffs[type.value]?.week || ""}
                        onChange={(e) => updateTariff(type.value, "week", e.target.value)}
                        className="w-24 h-10"
                        data-testid={`tariff-${type.value}-week`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={tariffs[type.value]?.season || ""}
                        onChange={(e) => updateTariff(type.value, "season", e.target.value)}
                        className="w-24 h-10"
                        data-testid={`tariff-${type.value}-season`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-slate-500 mt-4">
            * Los precios se aplican automáticamente según la duración del alquiler
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
