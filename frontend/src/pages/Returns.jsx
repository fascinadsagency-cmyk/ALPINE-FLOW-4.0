import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { rentalApi } from "@/lib/api";
import { 
  RotateCcw, 
  Check, 
  X, 
  AlertTriangle, 
  Loader2,
  Barcode,
  User,
  Calendar,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";

export default function Returns() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [rental, setRental] = useState(null);
  const [scannedBarcodes, setScannedBarcodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, []);

  const handleBarcodeScan = async (e) => {
    if (e.key !== 'Enter' || !barcodeInput.trim()) return;
    
    const barcode = barcodeInput.trim();
    setBarcodeInput("");
    
    // If no rental loaded, find rental by barcode
    if (!rental) {
      setLoading(true);
      try {
        const response = await rentalApi.getByBarcode(barcode);
        setRental(response.data);
        setScannedBarcodes([barcode]);
        toast.success(`Alquiler encontrado: ${response.data.customer_name}`);
      } catch (error) {
        toast.error("No se encontró alquiler activo para este artículo");
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Rental loaded, add barcode to scanned list
    const item = rental.items.find(i => i.barcode === barcode);
    if (!item) {
      toast.error("Este artículo no pertenece a este alquiler");
      return;
    }
    
    if (item.returned) {
      toast.info("Este artículo ya fue devuelto");
      return;
    }
    
    if (scannedBarcodes.includes(barcode)) {
      toast.info("Artículo ya escaneado");
      return;
    }
    
    setScannedBarcodes([...scannedBarcodes, barcode]);
    toast.success(`${item.brand} ${item.model} escaneado`);
  };

  const processReturn = async () => {
    if (!rental || scannedBarcodes.length === 0) return;
    
    setProcessing(true);
    try {
      const response = await rentalApi.processReturn(rental.id, scannedBarcodes);
      
      if (response.data.status === 'returned') {
        toast.success("Devolución completada");
        resetForm();
      } else {
        toast.warning(`Devolución parcial: ${response.data.pending_items.length} artículos pendientes`);
        // Reload rental to update status
        const updatedRental = await rentalApi.getById(rental.id);
        setRental(updatedRental.data);
        setScannedBarcodes([]);
      }
    } catch (error) {
      toast.error("Error al procesar devolución");
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setRental(null);
    setScannedBarcodes([]);
    setBarcodeInput("");
    if (barcodeRef.current) barcodeRef.current.focus();
  };

  const pendingItems = rental?.items.filter(i => !i.returned && !scannedBarcodes.includes(i.barcode)) || [];
  const returnedItems = rental?.items.filter(i => i.returned) || [];
  const toReturnItems = rental?.items.filter(i => !i.returned && scannedBarcodes.includes(i.barcode)) || [];

  return (
    <div className="p-6 lg:p-8" data-testid="returns-page">
      <h1 className="text-3xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Plus Jakarta Sans' }}>
        Devoluciones
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scanner Input */}
        <div className="lg:col-span-12">
          <Card className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                  <Input
                    ref={barcodeRef}
                    placeholder="Escanear código de barras para buscar alquiler o devolver artículo..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={handleBarcodeScan}
                    className="h-14 pl-12 text-xl font-mono"
                    data-testid="return-barcode-input"
                  />
                </div>
                {rental && (
                  <Button variant="outline" onClick={resetForm} className="h-14 px-6">
                    <X className="h-5 w-5 mr-2" />
                    Cancelar
                  </Button>
                )}
              </div>
              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {rental && (
          <>
            {/* Customer Info */}
            <div className="lg:col-span-4">
              <Card className="border-slate-200 h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-slate-500" />
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50">
                    <p className="font-semibold text-lg text-slate-900">{rental.customer_name}</p>
                    <p className="text-slate-500 font-mono">{rental.customer_dni}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-slate-50">
                      <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                        <Calendar className="h-4 w-4" />
                        Período
                      </div>
                      <p className="font-medium text-slate-900">
                        {rental.days} {rental.days === 1 ? 'día' : 'días'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50">
                      <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                        <DollarSign className="h-4 w-4" />
                        Pendiente
                      </div>
                      <p className={`font-medium ${rental.pending_amount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        €{rental.pending_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {rental.pending_amount > 0 && (
                    <div className="p-3 rounded-lg bg-red-50 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="text-red-700 font-medium">Pago pendiente</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Items Status */}
            <div className="lg:col-span-8 space-y-4">
              {/* Items to return (scanned) */}
              {toReturnItems.length > 0 && (
                <Card className="border-emerald-200 bg-emerald-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-emerald-700">
                      <Check className="h-5 w-5" />
                      Escaneados para devolver ({toReturnItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {toReturnItems.map((item) => (
                        <div 
                          key={item.barcode}
                          className="flex items-center justify-between p-3 rounded-lg bg-white border border-emerald-200"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{item.brand} {item.model}</p>
                            <p className="text-sm text-slate-500">
                              {item.item_type} • Talla {item.size} • <span className="font-mono">{item.barcode}</span>
                            </p>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <Check className="h-3 w-3 mr-1" /> Listo
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pending items */}
              {pendingItems.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="h-5 w-5" />
                      Pendientes de escanear ({pendingItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {pendingItems.map((item) => (
                        <div 
                          key={item.barcode}
                          className="flex items-center justify-between p-3 rounded-lg bg-white border border-amber-200"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{item.brand} {item.model}</p>
                            <p className="text-sm text-slate-500">
                              {item.item_type} • Talla {item.size} • <span className="font-mono">{item.barcode}</span>
                            </p>
                          </div>
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Pendiente
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Already returned */}
              {returnedItems.length > 0 && (
                <Card className="border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-500">
                      <Check className="h-5 w-5" />
                      Ya devueltos ({returnedItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {returnedItems.map((item) => (
                        <div 
                          key={item.barcode}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                        >
                          <div>
                            <p className="font-medium text-slate-600">{item.brand} {item.model}</p>
                            <p className="text-sm text-slate-400">
                              {item.item_type} • Talla {item.size}
                            </p>
                          </div>
                          <Badge variant="secondary">Devuelto</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Button */}
              {toReturnItems.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    size="lg"
                    onClick={processReturn}
                    disabled={processing}
                    className="h-14 px-8 text-lg font-semibold"
                    data-testid="process-return-btn"
                  >
                    {processing ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <RotateCcw className="h-5 w-5 mr-2" />
                    )}
                    Procesar Devolución ({toReturnItems.length} artículos)
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Empty State */}
        {!rental && !loading && (
          <div className="lg:col-span-12">
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <RotateCcw className="h-16 w-16 mb-4" />
              <p className="text-xl">Escanea cualquier artículo para iniciar la devolución</p>
              <p className="text-sm mt-2">El sistema encontrará automáticamente el alquiler asociado</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
